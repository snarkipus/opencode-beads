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
# Installed cache comparison is optional for other machines; its identity is not inferred from version.
installed = Path('/opt/data/home/.claude/plugins/cache/beads-marketplace/beads/1.3.0')
if installed.is_dir():
    plugin_entries = {p.removeprefix('plugins/beads/'): e for p, e in current_actual.items()
                      if p.startswith('plugins/beads/')}
    assert {str(p.relative_to(installed)) for p in installed.rglob('*') if p.is_file()} == plugin_entries.keys()
    for path, entry in plugin_entries.items():
        assert hashlib.sha256((installed / path).read_bytes()).hexdigest() == entry['sha256'], path

change = repo / 'openspec/changes/improve-beads-workflow-parity'
tasks = (change / 'tasks.md').read_text()
parsed_tasks = re.findall(r'^- \[([ xX])\] (\d+\.\d+) ', tasks, re.M)
task_ids = [task_id for _, task_id in parsed_tasks]
assert len(task_ids) == len(set(task_ids)) and task_ids
assert all(mark == ' ' for mark, _ in parsed_tasks), 'Implementation tasks must remain unchecked'
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
assert set(re.findall(r'https://github.com/anomalyco/opencode/blob/[a-f0-9]{40}/[^)\s]+', assessment)) == {
    e['url'] for e in native['sources']}
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
assert native['status'] == 'selected-planning' and native['runtime_qualification'] == 'not executed'
assert native['selected_minimum'] == '>=2.0.32 <3'

files = [p for p in (repo / 'openspec/changes/improve-beads-workflow-parity').rglob('*') if p.is_file()]
files += [repo / 'docs' / name for name in (
    'claude-code-integration-analysis.md', 'claude-code-integration-inventory.json',
    'opencode-native-parity-assessment.md', 'validate-parity-planning.py',
    'claude-code-local-reference.md', 'beads-artifact-policy.md',
    'claude-code-parity.md', 'opencode-sdk-contract.md')]
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
print(f'PASS: {len(task_ids)} unique unchecked tasks; {len(requirements)} normative requirements mapped; full corpus task coverage')
print(f'PASS: {len(files)} planning files whitespace/local links/containment, including untracked artifacts; no tracker access')
