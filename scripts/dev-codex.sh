#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHROME_ENDPOINT="http://127.0.0.1:9222/json/version"
CHROME_USER_DATA_DIR="/tmp/laplapla-chrome-devtools"
NEXT_URL="http://127.0.0.1:3000"
CODEX_PID_FILE="/tmp/laplapla-codex.pid"

log() {
  printf '[LapLapLa dev] %s\n' "$1"
}

chrome_ok() {
  curl -fsS --max-time 2 "$CHROME_ENDPOINT" >/dev/null 2>&1
}

next_ok() {
  local status
  status="$(curl -sS --head --max-time 2 -o /dev/null -w '%{http_code}' "$NEXT_URL" 2>/dev/null || true)"
  [[ "$status" != "000" && -n "$status" ]]
}

codex_ok() {
  [[ -f "$CODEX_PID_FILE" ]] || return 1

  local pid
  pid="$(cat "$CODEX_PID_FILE" 2>/dev/null || true)"
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1

  kill -0 "$pid" >/dev/null 2>&1
}

wait_until() {
  local label="$1"
  local check_command="$2"
  local attempts="${3:-30}"

  for _ in $(seq 1 "$attempts"); do
    if "$check_command"; then
      log "$label is ready."
      return 0
    fi
    sleep 1
  done

  log "$label did not become ready in time."
  return 1
}

run_in_terminal() {
  local title="$1"
  local shell_command="$2"

  /usr/bin/osascript - "$shell_command" "$title" <<'APPLESCRIPT'
on run argv
  set shellCommand to item 1 of argv
  set windowTitle to item 2 of argv

  tell application "Terminal"
    activate
    set tabRef to do script shellCommand
    try
      set custom title of tabRef to windowTitle
    end try
  end tell
end run
APPLESCRIPT
}

main() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    log "This launcher is intended for macOS."
    exit 1
  fi

  if [[ ! -x "$CHROME_BIN" ]]; then
    log "Chrome binary was not found at: $CHROME_BIN"
    exit 1
  fi

  if ! command -v codex >/dev/null 2>&1; then
    log "Codex CLI was not found in PATH."
    exit 1
  fi

  local root_q chrome_bin_q chrome_user_data_dir_q codex_pid_file_q
  root_q="$(printf '%q' "$ROOT_DIR")"
  chrome_bin_q="$(printf '%q' "$CHROME_BIN")"
  chrome_user_data_dir_q="$(printf '%q' "$CHROME_USER_DATA_DIR")"
  codex_pid_file_q="$(printf '%q' "$CODEX_PID_FILE")"

  if chrome_ok; then
    log "Chrome remote debugging is already available on port 9222."
  else
    log "Starting Chrome DevTools Browser on port 9222."
    run_in_terminal "LapLapLa Chrome DevTools" \
      "printf '%s\n' '[LapLapLa] Starting Chrome DevTools Browser on port 9222...'; exec $chrome_bin_q --remote-debugging-port=9222 --user-data-dir=$chrome_user_data_dir_q --no-first-run --no-default-browser-check http://localhost:3000/ru"
    wait_until "Chrome DevTools" chrome_ok 20
  fi

  if next_ok; then
    log "Next.js already responds on localhost:3000."
  else
    log "Starting Next.js development server."
    run_in_terminal "LapLapLa Next.js dev" \
      "cd $root_q && printf '%s\n' '[LapLapLa] Starting Next.js development server...'; exec npm run dev"
    wait_until "Next.js" next_ok 40
  fi

  if codex_ok; then
    log "Codex CLI already appears to be running from $CODEX_PID_FILE."
  else
    log "Starting Codex CLI."
    run_in_terminal "LapLapLa Codex" \
      "cd $root_q && printf '%s\n' \"\$\$\" > $codex_pid_file_q && printf '%s\n' '[LapLapLa] Starting Codex CLI...'; exec codex"
  fi

  printf '\n'
  printf 'Chrome DevTools: OK\n'
  printf 'Next.js: OK\n'
  printf 'Codex: STARTED\n'
}

main "$@"
