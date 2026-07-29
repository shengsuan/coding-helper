#!/usr/bin/env node

const { createWriteStream, chmodSync } = require("node:fs");
const { join } = require("node:path");
const { Readable } = require("node:stream");
const { finished } = require("node:stream/promises");
const { version } = require("../package.json");

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

const tag = `v${version}`;
const url = `https://github.com/shengsuan/coding-helper/releases/download/${tag}/${target}`;
const dest = join(__dirname, target);

async function download() {
  process.stdout.write(`正在从 GitHub Releases 下载 ${target}（${tag}）…\n`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP 状态 ${res.status} ${res.statusText}：${url}`);
    }
    
    const fileStream = createWriteStream(dest);
    await finished(Readable.fromWeb(res.body).pipe(fileStream));
    
    if (process.platform !== "win32") {
      chmodSync(dest, 0o755);
    }
    process.stdout.write("下载完成。\n");
  } catch (err) {
    process.stderr.write(`安装失败：${err.message}\n`);
    process.stderr.write("请确认对应的 GitHub Release 已创建且为公开状态。\n");
    process.exit(1);
  }
}

download();
