#!/usr/bin/env bash
# Builds the site for GitHub Pages and publishes out/ to the gh-pages branch of `origin`.
# Usage: npm run deploy
set -euo pipefail
cd "$(dirname "$0")/.."

remote="$(git remote get-url origin)"
slug="${remote#*github.com[:/]}"; slug="${slug%.git}"   # owner/repo
owner="$(printf '%s' "${slug%%/*}" | tr '[:upper:]' '[:lower:]')"
repo="${slug##*/}"
# A project site is served from /<repo>; an <owner>.github.io repo is served from the root.
if [ "$(printf '%s' "$repo" | tr '[:upper:]' '[:lower:]')" = "${owner}.github.io" ]; then base=""; else base="/${repo}"; fi

export NEXT_PUBLIC_BASE_PATH="$base"
export NEXT_PUBLIC_SITE_URL="https://${owner}.github.io${base}"
npm run build

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cp -R out/. "$tmp"
git -C "$tmp" init -q -b gh-pages
git -C "$tmp" add -A
git -C "$tmp" -c user.name="$(git config user.name)" -c user.email="$(git config user.email)" \
  commit -q -m "Deploy $(git rev-parse --short HEAD)"
# gh-pages only ever holds the latest build, so it is replaced rather than appended to.
git -C "$tmp" push -q -f "$remote" gh-pages
echo "Published to ${NEXT_PUBLIC_SITE_URL}/"
