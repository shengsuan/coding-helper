#!/usr/bin/env node

const { existsSync, chmodSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const targets = {
  "linux-x64": "coding-helper-linux-amd64",
  "darwin-x64": "coding-helper-macos-amd64",
  "darwin-arm64": "coding-helper-macos-arm64",
  "win32-x64": "coding-helper-windows-amd64.exe"
};

const target = targets[`${process.platform}-${process.arch}`];
if (!target) {
  process.stderr.write(`不支持的平台：${process.platform}-${process.arch}\n`);
  process.exit(1);
}

const binary = join(__dirname, target);
if (!existsSync(binary)) {
  process.stderr.write(`缺少适用于 ${process.platform}-${process.arch} 的二进制文件\n`);
  process.exit(1);
}

if (process.platform !== "win32") {
  chmodSync(binary, 0o755);
}

const result = spawnSync(binary, process.argv.slice(2), { stdio: "inherit" });
if (result.error) {
  process.stderr.write(`启动失败：${result.error.message}\n`);
  process.exit(1);
}
process.exit(result.status ?? 1);
