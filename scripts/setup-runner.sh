#!/usr/bin/env bash
# Register a self-hosted GitHub Actions runner for this repo and install it as
# a systemd service, the same way the mugshotcoffee and michi-vz runners are
# set up on this box. Each repo gets its own runner directory and service.
#
#   1. Open https://github.com/beany-vu/e-saxophone-learning/settings/actions/runners/new
#      and copy the registration token (it expires after an hour).
#   2. ./scripts/setup-runner.sh <token>
#
# Re-running is safe: it removes the old registration first.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/beany-vu/e-saxophone-learning}"
RUNNER_DIR="${RUNNER_DIR:-$HOME/e-saxophone-runner}"
RUNNER_NAME="${RUNNER_NAME:-$(hostname)-e-saxophone}"
RUNNER_LABELS="${RUNNER_LABELS:-self-hosted,linux,x64}"

TOKEN="${1:-}"
if [ -z "$TOKEN" ]; then
  echo "usage: $0 <registration-token>" >&2
  echo "get one at ${REPO_URL}/settings/actions/runners/new" >&2
  exit 1
fi

# Docker is what the deploy workflow actually drives, so fail early if the
# runner's user cannot reach it.
if ! docker info > /dev/null 2>&1; then
  echo "docker is not reachable as $(whoami). Start Docker Desktop and enable WSL integration." >&2
  exit 1
fi

# Ask GitHub for the current runner release, falling back to a known-good pin
# if the API is unreachable.
VERSION="${RUNNER_VERSION:-}"
if [ -z "$VERSION" ]; then
  VERSION="$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest \
    | grep -m1 '"tag_name"' | sed -E 's/.*"v?([^"]+)".*/\1/' || true)"
fi
VERSION="${VERSION:-2.328.0}"
echo "runner version: $VERSION"

mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

TARBALL="actions-runner-linux-x64-${VERSION}.tar.gz"
if [ ! -f "$TARBALL" ]; then
  echo "downloading $TARBALL"
  curl -fsSLO "https://github.com/actions/runner/releases/download/v${VERSION}/${TARBALL}"
fi
tar xzf "$TARBALL"

# Drop any previous registration so re-running does not create a duplicate
# runner on the repo. Needs a fresh token, which is why it is best-effort.
if [ -f .runner ]; then
  echo "removing previous registration"
  ./config.sh remove --token "$TOKEN" || echo "  (ignored - the old registration may already be gone)"
fi

./config.sh \
  --unattended \
  --url "$REPO_URL" \
  --token "$TOKEN" \
  --name "$RUNNER_NAME" \
  --labels "$RUNNER_LABELS" \
  --work _work \
  --replace

# svc.sh writes /etc/systemd/system/actions.runner.<owner>-<repo>.<name>.service
sudo ./svc.sh install "$(whoami)"
sudo ./svc.sh start
sudo ./svc.sh status

cat <<MSG

Runner installed at $RUNNER_DIR and started.

  status:  cd $RUNNER_DIR && sudo ./svc.sh status
  stop:    cd $RUNNER_DIR && sudo ./svc.sh stop
  remove:  cd $RUNNER_DIR && sudo ./svc.sh uninstall

It should now appear under ${REPO_URL}/settings/actions/runners
MSG
