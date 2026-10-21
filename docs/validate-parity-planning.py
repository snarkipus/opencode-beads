"""Check this planning packet against pinned evidence; no network or store access.

Usage: python3 docs/validate-parity-planning.py /path/to/parity-sources
Evidence layout: beads/ + beads-tree.json at inventory.commit; released/ +
native-release-tree.json at native_assessment.commit; minimum/ at minimum_commit;
native/ at development_commit; npm26/package and npm32/package extracted from
plugin-2.0.26.tgz / plugin-2.0.32.tgz. Download with gh api repo tarball/tree/ref
and the exact npm tarball URLs in the inventory, all outside the repository.
Current marketplace evidence: marketplace-main-commit.json, marketplace-main-tree.json
and marketplace-main/ at marketplace_main.commit. This validates source evidence and
planning coverage, not runtime contracts or model behavior.
"""
import base64
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
from collections import Counter

repo = Path(__file__).resolve().parents[1]
scratch = Path(sys.argv[1]).resolve()
data = json.loads((repo / 'docs/claude-code-integration-inventory.json').read_text())
report = (repo / 'docs/claude-code-integration-analysis.md').read_text()
native = data['native_assessment']
assessment = (repo / 'docs' / native['document']).read_text()

def verify_blob(path, entry, tree_entry):
    content = path.read_bytes()
    assert hashlib.sha256(content).hexdigest() == entry['sha256'], path
    blob = hashlib.sha1(b'blob ' + str(len(content)).encode() + b'\0' + content).hexdigest()
    assert blob == entry['git_blob'] == tree_entry['sha'], path

beads_tree = json.loads((scratch / 'beads-tree.json').read_text())
assert not beads_tree['truncated']
expected = {e['path']: e for e in beads_tree['tree'] if e['type'] == 'blob' and
            (e['path'].startswith(('plugins/beads/', 'internal/templates/skills/beads/')) or
             e['path'] in data['support_paths'])}
actual = {e['path']: e for e in data['files']}
assert len(actual) == len(data['files']) == 73
assert actual.keys() == expected.keys()
counts = Counter(e['category'] for e in actual.values())
assert counts['command'] == 29 and counts['resource'] == 15 and counts['adr'] == 1
for path, entry in actual.items():
    verify_blob(scratch / 'beads' / path, entry, expected[path])
    assert entry['owner_disposition'] in {'adapt', 'replace', 'preserve-external', 'reference-only', 'exclude', 'defer'}
    assert entry['url'] == f"https://github.com/{data['source_repository']}/blob/{data['commit']}/{path}"
    if entry['category'] in ('command', 'resource', 'adr'):
        assert entry['url'] in report
skill = (scratch / 'beads/plugins/beads/skills/beads/SKILL.md').read_text()
links = set(re.findall(r'\]\((resources/[^)]+)\)', skill))
resources = {str(Path(e['path']).relative_to('plugins/beads/skills/beads'))
             for e in data['files'] if e['category'] == 'resource'}
assert links == resources
assert (repo / '.agents/skills/beads/SKILL.md').read_bytes() == (
    scratch / 'beads/internal/templates/skills/beads/SKILL.md').read_bytes()

# Preserve historical identity separately; validate all current selected members.
current = data['marketplace_main']
commit_evidence = json.loads((scratch / current['commit_evidence']).read_text())
assert commit_evidence['sha'] == current['commit']
current_tree = json.loads((scratch / current['tree_evidence']).read_text())
assert not current_tree['truncated']
assert current_tree['sha'] in {current['commit'], commit_evidence['commit']['tree']['sha']}
current_expected = {e['path']: e for e in current_tree['tree'] if e['type'] == 'blob' and
                    (e['path'].startswith(('plugins/beads/', 'internal/templates/skills/beads/')) or
                     e['path'] in data['support_paths'])}
current_actual = {e['path']: e for e in current['files']}
assert len(current_actual) == len(current['files']) == 74
assert current_actual.keys() == current_expected.keys()
assert Counter(e['category'] for e in current_actual.values())['command'] == 29
assert Counter(e['category'] for e in current_actual.values())['resource'] == 15
assert Counter(e['category'] for e in current_actual.values())['adr'] == 1
assert Counter(e['release_delta'] for e in current_actual.values()) == {
    'added': 1, 'modified': 16, 'unchanged': 57}
for path, entry in current_actual.items():
    verify_blob(scratch / 'marketplace-main' / path, entry, current_expected[path])
    assert entry['url'] == f"https://github.com/{current['repository']}/blob/{current['commit']}/{path}"
    prior = actual.get(path)
    expected_delta = 'added' if prior is None else 'unchanged' if prior['git_blob'] == entry['git_blob'] else 'modified'
    assert entry['release_delta'] == expected_delta
assert current_actual.keys() - actual.keys() == {'plugins/beads/BUILD.bazel'}
assert not actual.keys() - current_actual.keys()
current_skill = (scratch / 'marketplace-main/plugins/beads/skills/beads/SKILL.md').read_text()
assert set(re.findall(r'\]\((resources/[^)]+)\)', current_skill)) == resources
# Ignore only the cache owner's .in_use runtime marker; all payload membership/hashes remain exact.
# Installed cache comparison is optional for other machines; its identity is not inferred from version.
installed = Path('/opt/data/home/.claude/plugins/cache/beads-marketplace/beads/1.3.0')
if installed.is_dir():
    plugin_entries = {p.removeprefix('plugins/beads/'): e for p, e in current_actual.items()
                      if p.startswith('plugins/beads/')}
    assert {str(p.relative_to(installed)) for p in installed.rglob('*') if p.is_file() and p.relative_to(installed).as_posix() != '.in_use'} == plugin_entries.keys()
    for path, entry in plugin_entries.items():
        assert hashlib.sha256((installed / path).read_bytes()).hexdigest() == entry['sha256'], path

change = repo / 'openspec/changes/improve-beads-workflow-parity'
tasks = (change / 'tasks.md').read_text()
parsed_tasks = re.findall(r'^- \[([ xX])\] (\d+\.\d+) ', tasks, re.M)
task_ids = [task_id for _, task_id in parsed_tasks]
assert len(task_ids) == len(set(task_ids)) and task_ids
# The active execution map must own every task exactly once, including new source deltas.
execution_map = (change / 'execution-map.md').read_text()
owner_rows = re.findall(r'^\| `(opencode-beads-vuy\.\d+)` \| ([0-9., ]+) \|', execution_map, re.M)
owned_ids = [task_id for _, ids in owner_rows for task_id in ids.strip().split(', ')]
assert len(owned_ids) == len(set(owned_ids)) and set(owned_ids) == set(task_ids)
assert len(owner_rows) == len({owner for owner, _ in owner_rows})

# Source tasks and 6.1 have parent-accepted deterministic/CLI evidence; live gates remain unexecuted.
accepted_tasks = {task_id for mark, task_id in parsed_tasks if mark.lower() == 'x'}
historical_accepted = {'1.2', '2.1', '2.2', '3.1', '3.2', '3.3', '4.1', '5.1', '6.1'}
source_delta = {'7.1', '7.2', '7.3'}
source_evidence = repo / 'docs/code-mode-source-acceptance-vuy10.md'
assert historical_accepted <= accepted_tasks
host_evidence = repo / 'docs/opencode-host-codemode-qualification-vuy2.md'
flow_evidence = repo / 'docs/opencode-stop-handoff-qualification-vuy6.md'
assert accepted_tasks <= historical_accepted | source_delta | {'1.1', '4.2'}, 'Installed/final 6.2/6.3 require their own acceptance'
if '4.2' in accepted_tasks:
    assert '1.1' in accepted_tasks and flow_evidence.is_file(), 'Live flow acceptance requires native host acceptance and its parent-reviewed observation record'
if '1.1' in accepted_tasks:
    assert host_evidence.is_file(), 'Native host acceptance requires its parent-reviewed observation record'
if accepted_tasks & source_delta:
    assert source_delta <= accepted_tasks and source_evidence.is_file(), 'Source delta acceptance requires its parent evidence record'
# Final review B1: stable task IDs with dependency/types preparation first.
assert task_ids.index('1.2') < task_ids.index('1.1')
task_text = dict(re.findall(r'^- \[[ xX]\] (\d+\.\d+) (.+)$', tasks, re.M))
assert 'After 1.2' in task_text['1.1'] and 'throwaway' in task_text['1.1']
assert 'tests/continuity.test.ts' not in task_text['1.1']
assert 'tests/continuity.test.ts' in task_text['3.1']
assert '1.1' not in task_text['5.1']
assert 'Live prerequisite for 1.1, 4.2 and 6.2' in tasks
valid_dispositions = {'adapt', 'replace', 'preserve-external', 'reference-only'}
for entry in data['files'] + current['files']:
    mapping = entry['selected_mapping']
    assert mapping['disposition'] in valid_dispositions
    assert all(mapping[k].strip() for k in ('group', 'target', 'reason'))
    assert mapping['task_ids'] and set(mapping['task_ids']) <= set(task_ids)
    if entry['category'] == 'command':
        assert mapping['target'] == 'oc-beads:' + Path(entry['path']).stem
    if entry['category'] == 'resource':
        assert mapping['target'] == 'assets/oc-beads/resources/' + Path(entry['path']).name
    if entry['path'] in actual and 'owner_disposition' in entry:
        assert entry['owner_disposition'] == mapping['disposition']
        assert entry['historical_owner_disposition'] == 'pending'
requirements = {(p.parent.name, title) for p in (change / 'specs').glob('*/spec.md')
                for title in re.findall(r'^### Requirement: (.+)$', p.read_text(), re.M)}
record = (change / 'reconciliation.md').read_text()
coverage_rows = re.findall(r'^\| (work-continuity|workflow-access|upstream-review) \| ([^|]+) \| ([0-9., ]+) \|$', record, re.M)
coverage = {(cap, title.strip()): ids.strip().split(', ') for cap, title, ids in coverage_rows}
assert len(coverage) == len(coverage_rows) and coverage.keys() == requirements
assert all(set(ids) <= set(task_ids) and ids for ids in coverage.values())
assert set(task_ids) - {i for ids in coverage.values() for i in ids} == {'6.3'}

release_tree = json.loads((scratch / 'native-release-tree.json').read_text())
assert not release_tree['truncated']
tree = {e['path']: e for e in release_tree['tree'] if e['type'] == 'blob'}
assert json.loads((scratch / 'native-tag.json').read_text())['object']['sha'] == native['commit']
assert json.loads((scratch / 'native-min-tag.json').read_text())['object']['sha'] == native['minimum_commit']
assert (scratch / 'native-dev-head.txt').read_text().strip() == native['development_commit']
source_paths = set()
for entry in native['sources']:
    path = entry['path']
    assert path not in source_paths
    source_paths.add(path)
    verify_blob(scratch / 'released' / path, entry, tree[path])
    assert entry['url'] == f"https://github.com/anomalyco/opencode/blob/{native['commit']}/{path}"
    assert entry['url'] in assessment and entry['id'] in assessment
assessment_source_urls = set(re.findall(r'https://github.com/anomalyco/opencode/blob/[a-f0-9]{40}/[^)\s]+', assessment))
historical_source_urls = {e['url'] for e in native['sources']}
current_source_urls = {e['url'] for e in data['host_baseline_211']['sources']}
# Preserve complete historical source membership while allowing cited 2.1.1 evidence.
# Both inventories' blobs/hashes are independently verified; unknown source URLs still fail.
assert historical_source_urls <= assessment_source_urls
assert assessment_source_urls <= historical_source_urls | current_source_urls
assert {e['id'] for e in native['sources']} == {f'S{i:02}' for i in range(1, 22)}
mechanisms = native['mechanisms'] + native['candidates']
assert {e['id'] for e in mechanisms} == {f'M{i:02}' for i in range(1, 11)} | {f'X{i:02}' for i in range(1, 10)}
assert {e['id'] for e in native['availability_anchors']} == {e['id'] for e in mechanisms}
for entry in mechanisms:
    assert entry['owner_disposition'] in {'adapt', 'replace', 'preserve-external', 'reference-only', 'exclude', 'defer'}
    assert f"| {entry['id']} " in assessment
    if entry['id'].startswith('M'):
        assert entry['availability'] == 'released-public'
    elif entry['id'] in ('X01', 'X02', 'X03', 'X04'):
        assert entry['availability'] == 'released-experimental'
    elif entry['id'] == 'X09':
        assert entry['availability'] == 'development-only'
for entry in native['availability_anchors']:
    assert entry['path'] in source_paths
    content = (scratch / 'released' / entry['path']).read_text()
    assert all(token in content for token in entry['tokens']), entry['id']
    assert all(token not in content for token in entry.get('absent', [])), entry['id']
assert 'tool.options?.permission ?? name' in (scratch / 'released/packages/core/src/tool.ts').read_text()
permission_source = (scratch / 'released/packages/core/src/permission.ts').read_text()
assert 'agentID ?? session.agent' in permission_source
assert 'existing.request.save?.length' in permission_source
assert 'access.authorizeExternal([target, ...directories], context)' in (scratch / 'released/packages/core/src/tool/plugin/shell.ts').read_text()
assert 'action: "external_directory"' in (scratch / 'released/packages/core/src/file-access.ts').read_text()
assert 'text.search(/\\s/)' in (scratch / 'released/packages/app/src/composer/client-slash-command.ts').read_text()
assert '| "list"' in (scratch / 'native/packages/plugin/src/promise/session.ts').read_text()
assert 'readonly assert:' not in (scratch / 'minimum/packages/plugin/src/promise/permission.ts').read_text()
for entry in native['package_evidence']:
    version = entry['version']
    content = (scratch / f'plugin-{version}.tgz').read_bytes()
    assert entry['integrity'] == 'sha512-' + base64.b64encode(hashlib.sha512(content).digest()).decode()
    directory = scratch / ('npm26' if version == '2.0.26' else 'npm32') / 'package'
    assert json.loads((directory / 'package.json').read_text())['version'] == version
for name in native['declarations_identical_26_32']:
    rel = f'package/dist/promise/{name}.d.ts'
    assert (scratch / 'npm26' / rel).read_bytes() == (scratch / 'npm32' / rel).read_bytes()
assert 'readonly assert:' not in (scratch / 'npm26/package/dist/promise/permission.d.ts').read_text()
assert 'readonly assert:' in (scratch / 'npm32/package/dist/promise/permission.d.ts').read_text()
assert '| "list"' not in (scratch / 'npm32/package/dist/promise/session.d.ts').read_text()
assert native['status'] == 'historical-planning' and native['runtime_qualification'] == 'not executed'
assert native['selected_minimum'] == '>=2.0.32 <3'

# New baseline evidence is additive; never relabel historical 2.0.32 sources.
new = data['host_baseline_211']
assert new['commit'] == 'ba546ec1598a70db2570e9c6258028d955ba8f58'
assert new['previous_commit'] == native['commit']
assert new['admission_range'] == '>=2.1.1 <2.2' and new['exact_live_target'] == '2.1.1'
assert new['runtime_qualification'] == 'not executed'
cache = scratch / new['cache']
assert json.loads((cache / 'tag.json').read_text())['object'] == {
    'sha': new['commit'], 'type': 'commit',
    'url': f"https://api.github.com/repos/anomalyco/opencode/git/commits/{new['commit']}"}
new_tree = json.loads((cache / 'tree.json').read_text())
assert not new_tree['truncated'] and new_tree['sha'] == new['commit']
new_blobs = {e['path']: e for e in new_tree['tree'] if e['type'] == 'blob'}
new_paths = [e['path'] for e in new['sources']]
assert len(new_paths) == len(set(new_paths)) and source_paths <= set(new_paths)
for entry in new['sources']:
    path = entry['path']
    verify_blob(cache / 'source' / path, entry, new_blobs[path])
    assert entry['url'] == f"https://github.com/anomalyco/opencode/blob/{new['commit']}/{path}"
    prior = tree.get(path)
    assert entry['old_git_blob'] == (prior['sha'] if prior else None)
    delta = 'added' if prior is None else 'unchanged' if prior['sha'] == entry['git_blob'] else 'modified'
    assert entry['delta'] == delta
    if prior:
        old = (scratch / 'released' / path).read_bytes()
        assert hashlib.sha1(b'blob ' + str(len(old)).encode() + b'\0' + old).hexdigest() == prior['sha']
npm = json.loads((cache / 'npm.json').read_text())
package = new['package']
assert npm['name'] == package['name'] and npm['version'] == package['version'] == '2.1.1'
assert npm['dist']['tarball'] == package['tarball'] and npm['dist']['integrity'] == package['integrity']
tarball = (cache / 'plugin-2.1.1.tgz').read_bytes()
assert hashlib.sha256(tarball).hexdigest() == package['sha256']
assert 'sha512-' + base64.b64encode(hashlib.sha512(tarball).digest()).decode() == package['integrity']
import io
import tarfile
with tarfile.open(fileobj=io.BytesIO(tarball)) as archive:
    assert json.loads(archive.extractfile('package/package.json').read())['version'] == '2.1.1'
    for entry in new['declarations']:
        content = (cache / 'npm' / entry['path']).read_bytes()
        assert content == archive.extractfile(entry['path']).read()
        prior = (scratch / 'npm32' / entry['path']).read_bytes()
        assert hashlib.sha256(content).hexdigest() == entry['sha256']
        assert hashlib.sha256(prior).hexdigest() == entry['old_sha256']
        assert entry['delta'] == ('unchanged' if content == prior else 'modified')
for domain in ('effect', 'promise'):
    source = (cache / f'source/packages/plugin/src/{domain}/session.ts').read_text()
    declaration = (cache / f'npm/package/dist/{domain}/session.d.ts').read_text()
    assert '| "list"' in source and 'native?:' in source and 'providerState?:' not in source
    assert '"list"' in declaration and 'native?:' in declaration
assert new['availability_overrides']['X09']['availability'] == 'released-public'
assert new['availability_overrides']['X09']['disposition'] == 'reference-only'
assert 'metadata.keepID' in (cache / 'source/packages/core/src/session/history.ts').read_text()
assert 'tool.options?.permission ?? name' in (cache / 'source/packages/core/src/tool.ts').read_text()
assert 'existing.request.save?.length' in (cache / 'source/packages/core/src/permission.ts').read_text()
assert re.search(r'^## (v[^ ]+)', (cache / 'source/CHANGELOG.md').read_text(), re.M)[1] == 'v2.1.0'
assert set(new['task_ids']) <= set(task_ids)
print(f"PASS: 2.1.1 separate pin, {len(new_paths)} endpoint sources, published tarball/declarations, conservative admission; runtime unexecuted")

files = [p for p in (repo / 'openspec/changes/improve-beads-workflow-parity').rglob('*') if p.is_file()]
files += [repo / 'docs' / name for name in (
    'claude-code-integration-analysis.md', 'claude-code-integration-inventory.json',
    'opencode-native-parity-assessment.md', 'validate-parity-planning.py',
    'claude-code-local-reference.md', 'beads-artifact-policy.md',
    'claude-code-parity.md', 'opencode-sdk-contract.md',
    'reviews/opus-planning-review-50919ae.md', 'opencode-2.1.1-contract-delta.md')]
for path in files:
    assert not path.is_symlink() and path.resolve().is_relative_to(repo)
    check = subprocess.run(['git', 'diff', '--no-index', '--check', '/dev/null', str(path)],
                           capture_output=True, text=True)
    assert check.returncode in (0, 1) and not check.stdout and not check.stderr, (path, check.stdout, check.stderr)
    if path.suffix == '.md':
        for link in re.findall(r'\]\(([^)]+)\)', path.read_text()):
            if not link.startswith(('https:', 'http:', '#')):
                assert (path.parent / link.split('#')[0]).exists(), (path, link)
print(f'PASS: {len(actual)} Claude files; 29 commands, 15 resources, 1 ADR; Git/SHA identity and complete coverage')
print(f'PASS: {len(native["sources"])} native files / 21 source groups; 10 mechanisms, 9 candidates; links and availability anchors')
print('PASS: npm tarball integrity, 2.0.26/2.0.32 declaration comparison, permission assertion and development-only listing distinctions')
print(f'PASS: {len(current_actual)} marketplace-main files, complete dispositions and installed comparison when available')
print(f'PASS: {len(task_ids)} unique tasks ({len(accepted_tasks)} accepted, {len(task_ids) - len(accepted_tasks)} unchecked); {len(requirements)} normative requirements mapped; full corpus task coverage')
print(f'PASS: {len(files)} planning files whitespace/local links/containment, including untracked artifacts; no tracker access')
