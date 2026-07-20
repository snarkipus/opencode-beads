#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SYNC_SCRIPT="$SCRIPT_DIR/sync-beads.sh"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

UPSTREAM="$TEMP_DIR/upstream"
ORIGIN="$TEMP_DIR/origin.git"
REPO="$TEMP_DIR/repo"

git init -q "$UPSTREAM"
git -C "$UPSTREAM" config user.name "Sync Test"
git -C "$UPSTREAM" config user.email "sync-test@example.com"
mkdir -p "$UPSTREAM/plugins/beads/skills/beads" "$UPSTREAM/plugins/beads/agents"
cp -R "$PROJECT_DIR/vendor/commands" "$UPSTREAM/plugins/beads/skills/beads/commands"
cp "$PROJECT_DIR/vendor/agents/task-agent.md" "$UPSTREAM/plugins/beads/agents/task-agent.md"
git -C "$UPSTREAM" add .
git -C "$UPSTREAM" commit -qm "fixture"
git -C "$UPSTREAM" tag v1.2.3

git init -q --bare "$ORIGIN"
git clone -q "$ORIGIN" "$REPO"
git -C "$REPO" config user.name "Sync Test"
git -C "$REPO" config user.email "sync-test@example.com"
mkdir -p "$REPO/vendor/commands" "$REPO/vendor/agents"
cp -R "$PROJECT_DIR/vendor/commands/." "$REPO/vendor/commands/"
cp "$PROJECT_DIR/vendor/agents/task-agent.md" "$REPO/vendor/agents/task-agent.md"
printf '%s\n' 'old command' > "$REPO/vendor/commands/ready.md"
printf '%s\n' 'old agent' > "$REPO/vendor/agents/task-agent.md"
printf '%s\n' 'keep agent' > "$REPO/vendor/agents/keep.md"
printf '%s\n' 'keep vendor file' > "$REPO/vendor/README.md"
cat > "$REPO/CHANGELOG.md" <<'EOF'
# Changelog

## [Unreleased]

### Changed

- Existing change

## [1.0.0]
EOF
git -C "$REPO" add .
git -C "$REPO" commit -qm "initial"
git -C "$REPO" push -qu origin HEAD:main

BEFORE="$(git -C "$REPO" status --porcelain=v1)"
BEFORE_HEAD="$(git -C "$REPO" rev-parse HEAD)"
PLUGIN_DIR="$REPO" BEADS_REPO="file://$UPSTREAM" "$SYNC_SCRIPT" --dry-run >/dev/null
AFTER="$(git -C "$REPO" status --porcelain=v1)"
[[ "$BEFORE" == "$AFTER" ]]
[[ "$(git -C "$REPO" rev-parse HEAD)" == "$BEFORE_HEAD" ]]
[[ "$(<"$REPO/vendor/commands/ready.md")" == "old command" ]]

printf '%s\n' 'dirty' > "$REPO/unrelated.txt"
if PLUGIN_DIR="$REPO" BEADS_REPO="file://$UPSTREAM" "$SYNC_SCRIPT" --dry-run >/dev/null 2>&1; then
  echo "Dirty working tree was not rejected" >&2
  exit 1
fi
rm "$REPO/unrelated.txt"

CURRENT_BRANCH="$(git -C "$REPO" branch --show-current)"
PLUGIN_DIR="$REPO" BEADS_REPO="file://$UPSTREAM" CREATE_PR=false "$SYNC_SCRIPT" >/dev/null
[[ "$(git -C "$REPO" branch --show-current)" == "$CURRENT_BRANCH" ]]
[[ -z "$(git -C "$REPO" status --porcelain=v1)" ]]
[[ "$(git --git-dir="$ORIGIN" show 'sync-beads/v1.2.3:vendor/commands/ready.md')" == "$(<"$PROJECT_DIR/vendor/commands/ready.md")" ]]
[[ "$(git --git-dir="$ORIGIN" show 'sync-beads/v1.2.3:vendor/agents/task-agent.md')" == "$(<"$PROJECT_DIR/vendor/agents/task-agent.md")" ]]
[[ "$(git --git-dir="$ORIGIN" show 'sync-beads/v1.2.3:vendor/agents/keep.md')" == "keep agent" ]]
[[ "$(git --git-dir="$ORIGIN" show 'sync-beads/v1.2.3:vendor/README.md')" == "keep vendor file" ]]
git --git-dir="$ORIGIN" show 'sync-beads/v1.2.3:CHANGELOG.md' | grep -q -- '- Synced vendored beads files to v1.2.3'

CHANGED_PATHS="$(git --git-dir="$ORIGIN" diff-tree --no-commit-id --name-only -r 'sync-beads/v1.2.3' | sort)"
EXPECTED_PATHS="$(printf '%s\n' CHANGELOG.md vendor/agents/task-agent.md vendor/commands/ready.md | sort)"
[[ "$CHANGED_PATHS" == "$EXPECTED_PATHS" ]]

PLUGIN_DIR="$REPO" BEADS_REPO="file://$UPSTREAM" CREATE_PR=false "$SYNC_SCRIPT" >/dev/null
[[ "$(git -C "$REPO" branch --show-current)" == "$CURRENT_BRANCH" ]]
[[ -z "$(git -C "$REPO" status --porcelain=v1)" ]]

CONFLICT_REPO="$TEMP_DIR/conflict"
git clone -q --branch sync-beads/v1.2.3 "$ORIGIN" "$CONFLICT_REPO"
git -C "$CONFLICT_REPO" config user.name "Sync Test"
git -C "$CONFLICT_REPO" config user.email "sync-test@example.com"
printf '%s\n' 'conflicting agent' > "$CONFLICT_REPO/vendor/agents/task-agent.md"
git -C "$CONFLICT_REPO" add vendor/agents/task-agent.md
git -C "$CONFLICT_REPO" commit -qm "conflicting retry"
git -C "$CONFLICT_REPO" push -q origin sync-beads/v1.2.3

if PLUGIN_DIR="$REPO" BEADS_REPO="file://$UPSTREAM" CREATE_PR=false "$SYNC_SCRIPT" >/dev/null 2>&1; then
  echo "Conflicting remote branch was not rejected" >&2
  exit 1
fi
[[ "$(git --git-dir="$ORIGIN" show 'sync-beads/v1.2.3:vendor/agents/task-agent.md')" == "conflicting agent" ]]
[[ "$(git -C "$REPO" branch --show-current)" == "$CURRENT_BRANCH" ]]
[[ -z "$(git -C "$REPO" status --porcelain=v1)" ]]

printf '\nUse the beads MCP server.\n' >> "$UPSTREAM/plugins/beads/skills/beads/commands/ready.md"
git -C "$UPSTREAM" add plugins/beads/skills/beads/commands/ready.md
git -C "$UPSTREAM" commit -qm "invalid fixture"
git -C "$UPSTREAM" tag v1.2.4

if PLUGIN_DIR="$REPO" BEADS_REPO="file://$UPSTREAM" "$SYNC_SCRIPT" --dry-run >/dev/null 2>&1; then
  echo "Invalid vendor candidate was not rejected" >&2
  exit 1
fi
[[ "$(git -C "$REPO" branch --show-current)" == "$CURRENT_BRANCH" ]]
[[ -z "$(git -C "$REPO" status --porcelain=v1)" ]]

echo "sync-beads safety tests passed"
