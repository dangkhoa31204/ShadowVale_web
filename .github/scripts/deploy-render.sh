#!/usr/bin/env bash
set -euo pipefail

# This script is called only by the push-to-dev job after its CI dependency passes.
if [[ "${GITHUB_EVENT_NAME:-}" != "push" || "${GITHUB_REF:-}" != "refs/heads/dev" ]]; then
  echo "::error::CD is restricted to push events on dev."
  exit 1
fi
case "${RENDER_COMPONENT:-}" in
  frontend|backend) ;;
  *) echo "::error::Missing or invalid Render component."; exit 1 ;;
esac
if [[ -z "${RENDER_DEPLOY_HOOK:-}" ]]; then
  echo "::error::Missing Render deploy hook. Add the service hook to the GitHub repository secret named by this job."
  exit 1
fi
if [[ ! "$RENDER_DEPLOY_HOOK" =~ ^https://api\.render\.com/deploy/[a-zA-Z0-9_-]+\?key=[a-zA-Z0-9_-]+$ ]]; then
  echo "::error::Expected an unmodified Render Deploy Hook URL from Service Settings."
  exit 1
fi
if [[ ! "${GITHUB_SHA:-}" =~ ^[a-fA-F0-9]{40}$ ]]; then
  echo "::error::Missing or invalid commit SHA."
  exit 1
fi

# Skip stale code for this component, but still deploy if newer commits only
# changed the other component (its path-filtered CI cannot deploy this one).
git fetch --no-tags --depth=1 origin dev
if [[ "$(git rev-parse FETCH_HEAD)" != "$GITHUB_SHA" ]]; then
  if git diff --quiet "$GITHUB_SHA" FETCH_HEAD -- "$RENDER_COMPONENT" \
    ".github/workflows/$RENDER_COMPONENT.yml" .github/scripts/deploy-render.sh; then
    echo "Newer commits do not change this component; deploying its tested SHA."
  else
    result=$?
    if [[ "$result" != 1 ]]; then
      echo "::error::Could not compare the latest commit; refusing deployment."
      exit 1
    fi
    echo "Newer code exists for this component; skipping this deployment."
    exit 0
  fi
fi

# Do not print the hook, response body, or transport error containing credentials.
# Do not retry automatically: an ambiguous timeout may already have started a deploy.
if ! status=$(curl --silent --output /dev/null --write-out '%{http_code}' \
  --connect-timeout 10 --max-time 60 --get \
  --data-urlencode "ref=$GITHUB_SHA" "$RENDER_DEPLOY_HOOK" 2>/dev/null); then
  echo "::error::Render deploy request failed. Check Render Events before retrying."
  exit 1
fi
case "$status" in
  200|202)
    echo "Render accepted deployment of $GITHUB_SHA (HTTP $status). Check Render Events for the build and live status."
    ;;
  *)
    echo "::error::Render rejected deployment (HTTP $status). Check the service hook, repository access, and service status."
    exit 1
    ;;
esac
