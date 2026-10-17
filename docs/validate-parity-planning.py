"""Check this planning packet against pinned evidence; no network or store access.

Usage: python3 docs/validate-parity-planning.py /path/to/parity-sources
Evidence layout: beads/ + beads-tree.json at inventory.commit; released/ +
native-release-tree.json at native_assessment.commit; minimum/ at minimum_commit;
native/ at development_commit; npm26/package and npm32/package extracted from
plugin-2.0.26.tgz / plugin-2.0.32.tgz. Download with gh api repo tarball/tree/ref
and the exact npm tarball URLs in the inventory, all outside the repository.
This validates source evidence, not runtime contracts or model behavior.
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
    assert entry['owner_disposition'] == 'pending'
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
    assert entry['owner_disposition'] == 'pending'
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
assert native['status'] == 'pending' and native['runtime_qualification'] == 'not executed'

files = [p for p in (repo / 'openspec/changes/improve-beads-workflow-parity').rglob('*') if p.is_file()]
files += [repo / 'docs' / name for name in (
    'claude-code-integration-analysis.md', 'claude-code-integration-inventory.json',
    'opencode-native-parity-assessment.md', 'validate-parity-planning.py')]
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
print(f'PASS: pending dispositions, {len(files)} planning files whitespace/local links/containment; no freeze-marker or tracker access')
