#!/usr/bin/env bash
# PostToolUse (Write|Edit): formatea con Prettier los archivos editados dentro de frontend/.
f=$(jq -r '.tool_response.filePath // .tool_input.file_path // empty')
root="$CLAUDE_PROJECT_DIR/frontend"
case "$f" in
  "$root"/node_modules/*|"$root"/dist/*) exit 0 ;;
  "$root"/*) cd "$root" && npx --no-install prettier --write --ignore-unknown "$f" >/dev/null ;;
esac
exit 0
