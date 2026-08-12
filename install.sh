#!/bin/sh
set -eu

PKG_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo 0.0.0)
go install -ldflags="-X github.com/shengsuan/coding-helper/internal/app.version=v${PKG_VERSION}" ./cmd/coding-helper
echo "Installed coding-helper to $(go env GOPATH)/bin"

