BIN := bin/ch

.PHONY: build test vet clean npm-package npm-publish

build:
	go build -o $(BIN) ./cmd/coding-helper

test:
	go test ./...

vet:
	go vet ./...

clean:
	rm -rf bin

npm-package:
	test -n "$(VERSION)"
	mkdir -p bin
	GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o bin/coding-helper-linux-amd64 ./cmd/coding-helper
	GOOS=darwin GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o bin/coding-helper-macos-amd64 ./cmd/coding-helper
	GOOS=darwin GOARCH=arm64 go build -trimpath -ldflags="-s -w" -o bin/coding-helper-macos-arm64 ./cmd/coding-helper
	GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o bin/coding-helper-windows-amd64.exe ./cmd/coding-helper
	npm version $(VERSION) --no-git-tag-version
	npm pack

npm-publish: npm-package
	npm publish --access public
