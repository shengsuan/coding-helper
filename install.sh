#!/bin/sh
set -eu

go install ./cmd/coding-helper
echo "Installed coding-helper to $(go env GOPATH)/bin"
