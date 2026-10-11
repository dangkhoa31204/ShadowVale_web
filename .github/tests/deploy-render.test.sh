#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

# All Git/network operations are replaced with functions: never contact Render.
git() {
  case "$1" in
    fetch) return 0 ;;
    rev-parse) echo "$TEST_HEAD" ;;
    diff) return "$TEST_DIFF" ;;
    *) return 99 ;;
  esac
}
curl() {
  # Assert deployment uses the tested SHA and retains the private hook's query.
  local found=false prev='' arg
  for arg in "$@"; do
    if [[ "$prev" == --data-urlencode && "$arg" == "ref=$GITHUB_SHA" ]]; then found=true; fi
    prev="$arg"
  done
  [[ "$found" == true && "$prev" == "$RENDER_DEPLOY_HOOK" ]] || return 98
  if [[ "$TEST_HTTP" == transport-error ]]; then return 28; fi
  printf '%s' "$TEST_HTTP"
}
export -f git curl

tested=0
check() {
  local name="$1" expected_status="$2" expected_text="$3" output status
  shift 3
  set +e
  output=$(
    export GITHUB_EVENT_NAME=push GITHUB_REF=refs/heads/dev
    export GITHUB_SHA=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    export RENDER_COMPONENT=frontend
    export RENDER_DEPLOY_HOOK='https://api.render.com/deploy/srv-testing?key=testing-only-key'
    export TEST_HEAD="$GITHUB_SHA" TEST_DIFF=0 TEST_HTTP=200
    for assignment in "$@"; do export "$assignment"; done
    bash .github/scripts/deploy-render.sh
  )
  status=$?
  set -e
  if [[ "$status" != "$expected_status" || "$output" != *"$expected_text"* || "$output" == *testing-only-key* ]]; then
    echo "FAIL: $name (exit $status): $output"
    exit 1
  fi
  tested=$((tested + 1))
  echo "PASS: $name"
}

check 'PR cannot deploy' 1 'restricted' GITHUB_EVENT_NAME=pull_request
check 'main cannot deploy' 1 'restricted' GITHUB_REF=refs/heads/main
check 'missing hook blocks deploy' 1 'Missing Render deploy hook' RENDER_DEPLOY_HOOK=
check 'invalid hook host blocks deploy' 1 'Expected an unmodified' RENDER_DEPLOY_HOOK=https://example.com/deploy
check 'invalid SHA blocks deploy' 1 'invalid commit SHA' GITHUB_SHA=bad
check 'invalid component blocks deploy' 1 'invalid Render component' RENDER_COMPONENT=unknown
check 'accepted deploy pins tested SHA' 0 'HTTP 200'
check 'queued deploy is reported as accepted' 0 'HTTP 202' TEST_HTTP=202 RENDER_COMPONENT=backend
check 'HTTP error fails the job' 1 'HTTP 401' TEST_HTTP=401
check 'ambiguous timeout fails without retry' 1 'Check Render Events before retrying' TEST_HTTP=transport-error
check 'newer component code skips old deploy' 0 'skipping this deployment' TEST_HEAD=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb TEST_DIFF=1
check 'other component changes do not lose pending deploy' 0 'HTTP 200' TEST_HEAD=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb TEST_DIFF=0
check 'failed comparison blocks deploy' 1 'Could not compare' TEST_HEAD=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb TEST_DIFF=2
echo "$tested CD checks passed; no real deploy requests sent."
