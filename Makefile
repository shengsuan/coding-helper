BIN := bin/ch
PKG_VERSION := $(shell node -p "require('./package.json').version" 2>/dev/null || echo 0.0.0)
LDFLAGS := -X github.com/shengsuan/coding-helper/internal/app.version=v$(PKG_VERSION)

.PHONY: build test vet clean npm-package npm-publish

build:
	go build -ldflags="$(LDFLAGS)" -o $(BIN) ./cmd/coding-helper

test:
	go test ./...

vet:
	go vet ./...

clean:
	rm -rf bin

npm-package:
	test -n "$(VERSION)"
	mkdir -p bin
	npm version $(VERSION) --no-git-tag-version
	GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/shengsuan/coding-helper/internal/app.version=v$(VERSION)" -o bin/coding-helper-linux-amd64 ./cmd/coding-helper
	GOOS=darwin GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/shengsuan/coding-helper/internal/app.version=v$(VERSION)" -o bin/coding-helper-macos-amd64 ./cmd/coding-helper
	GOOS=darwin GOARCH=arm64 go build -trimpath -ldflags="-s -w -X github.com/shengsuan/coding-helper/internal/app.version=v$(VERSION)" -o bin/coding-helper-macos-arm64 ./cmd/coding-helper
	GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="-s -w -X github.com/shengsuan/coding-helper/internal/app.version=v$(VERSION)" -o bin/coding-helper-windows-amd64.exe ./cmd/coding-helper
	npm pack

npm-publish: npm-package
	npm publish --access public
