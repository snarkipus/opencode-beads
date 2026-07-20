#!/usr/bin/env bash

set -euo pipefail

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

BEADS_REPO="${BEADS_REPO:-https://github.com/gastownhall/beads.git}"
CREATE_PR="${CREATE_PR:-true}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="${PLUGIN_DIR:-$(dirname "$SCRIPT_DIR")}"

if [[ -n "$(git -C "$PLUGIN_DIR" status --porcelain --untracked-files=all)" ]]; then
  echo "Refusing to sync with a dirty working tree" >&2
  exit 1
fi

TEMP_DIR="$(mktemp -d)"
WORKTREE_DIR="$TEMP_DIR/worktree"
WORKTREE_ADDED=false

cleanup() {
  if $WORKTREE_ADDED; then
    git -C "$PLUGIN_DIR" worktree remove --force "$WORKTREE_DIR" >/dev/null 2>&1 || true
  fi
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

TAGS_FILE="$TEMP_DIR/tags"
git ls-remote --tags "$BEADS_REPO" > "$TAGS_FILE"
read -r BEADS_VERSION BEADS_COMMIT < <(bun "$SCRIPT_DIR/vendor-provenance.ts" select-release "$TAGS_FILE")
SAFE_VERSION="${BEADS_VERSION//[^a-zA-Z0-9._-]/-}"
BRANCH="sync-beads/$SAFE_VERSION"

git -c advice.detachedHead=false clone --depth 1 --branch "$BEADS_VERSION" --quiet "$BEADS_REPO" "$TEMP_DIR/beads"
CLONED_COMMIT="$(git -C "$TEMP_DIR/beads" rev-parse HEAD)"
if [[ "$CLONED_COMMIT" != "$BEADS_COMMIT" ]]; then
  echo "Resolved tag $BEADS_VERSION changed during sync" >&2
  exit 1
fi

UPSTREAM_COMMANDS="$TEMP_DIR/beads/plugins/beads/skills/beads/commands"
UPSTREAM_AGENT="$TEMP_DIR/beads/plugins/beads/agents/task-agent.md"
CANDIDATE_VENDOR="$TEMP_DIR/vendor"

if [[ ! -d "$UPSTREAM_COMMANDS" ]] || ! compgen -G "$UPSTREAM_COMMANDS/*.md" >/dev/null; then
  echo "Upstream command templates are missing" >&2
  exit 1
fi
if [[ ! -f "$UPSTREAM_AGENT" ]]; then
  echo "Upstream task agent is missing" >&2
  exit 1
fi

mkdir -p "$CANDIDATE_VENDOR/commands" "$CANDIDATE_VENDOR/agents"
cp -R "$UPSTREAM_COMMANDS/." "$CANDIDATE_VENDOR/commands/"
cp "$UPSTREAM_AGENT" "$CANDIDATE_VENDOR/agents/task-agent.md"
bun "$SCRIPT_DIR/vendor-provenance.ts" write "$CANDIDATE_VENDOR" "$BEADS_REPO" "$BEADS_VERSION" "$BEADS_COMMIT"
bun "$SCRIPT_DIR/validate-vendor.ts" "$CANDIDATE_VENDOR" "$BEADS_REPO" "$BEADS_VERSION" "$BEADS_COMMIT"

if diff -qr "$PLUGIN_DIR/vendor/commands" "$CANDIDATE_VENDOR/commands" >/dev/null 2>&1 \
  && cmp -s "$PLUGIN_DIR/vendor/agents/task-agent.md" "$CANDIDATE_VENDOR/agents/task-agent.md" \
  && cmp -s "$PLUGIN_DIR/vendor/manifest.json" "$CANDIDATE_VENDOR/manifest.json"; then
  echo "No changes detected for $BEADS_VERSION"
  exit 0
fi

if $DRY_RUN; then
  echo "[dry-run] Vendor changes detected for $BEADS_VERSION"
  echo "[dry-run] Would push branch $BRANCH and create a pull request"
  exit 0
fi

WORKTREE_ADDED=true
git -C "$PLUGIN_DIR" worktree add --quiet --detach "$WORKTREE_DIR" HEAD

rm -rf "$WORKTREE_DIR/vendor/commands"
mkdir -p "$WORKTREE_DIR/vendor/agents"
cp -R "$CANDIDATE_VENDOR/commands" "$WORKTREE_DIR/vendor/commands"
cp "$CANDIDATE_VENDOR/agents/task-agent.md" "$WORKTREE_DIR/vendor/agents/task-agent.md"
cp "$CANDIDATE_VENDOR/manifest.json" "$WORKTREE_DIR/vendor/manifest.json"

CHANGELOG="$WORKTREE_DIR/CHANGELOG.md"
UNRELEASED_SECTION="$(sed -n '/^## \[Unreleased\]$/,/^## \[/p' "$CHANGELOG")"
if grep -q "^### Changed$" <<< "$UNRELEASED_SECTION"; then
  sed -i "/^## \[Unreleased\]$/,/^## \[/ {
    /^### Changed$/a\\
- Synced vendored beads files to $BEADS_VERSION
  }" "$CHANGELOG"
else
  sed -i "/^## \[Unreleased\]$/a\\
\\
### Changed\\
\\
- Synced vendored beads files to $BEADS_VERSION" "$CHANGELOG"
fi

git -C "$WORKTREE_DIR" add CHANGELOG.md vendor/commands vendor/agents/task-agent.md vendor/manifest.json
git -C "$WORKTREE_DIR" commit -m "sync: beads $BEADS_VERSION"

if git -C "$WORKTREE_DIR" ls-remote --exit-code --heads origin "refs/heads/$BRANCH" >/dev/null 2>&1; then
  git -C "$WORKTREE_DIR" fetch --quiet origin "$BRANCH"
  if ! git -C "$WORKTREE_DIR" diff --quiet FETCH_HEAD HEAD; then
    echo "Remote branch $BRANCH already exists with different content" >&2
    exit 1
  fi
  echo "Remote branch $BRANCH already contains the vendor update"
else
  git -C "$WORKTREE_DIR" push origin "HEAD:refs/heads/$BRANCH"
fi

if $CREATE_PR && command -v gh >/dev/null; then
  ORIGIN_URL="$(git -C "$PLUGIN_DIR" remote get-url origin)"
  PR_COUNT="$(gh pr list --repo "$ORIGIN_URL" --head "$BRANCH" --json number --jq 'length')"
  if [[ "$PR_COUNT" == "0" ]]; then
    gh pr create \
      --repo "$ORIGIN_URL" \
      --head "$BRANCH" \
      --title "sync: beads $BEADS_VERSION" \
      --body "Automated sync of vendored beads files to $BEADS_VERSION"
  fi
fi
