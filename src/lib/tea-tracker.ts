import { execSync, spawn } from "child_process";
import { platform, release } from "os";
import { readFileSync } from "fs";
import { createHash } from "crypto";
import { TEA_CONFIG } from "./constants.js";

let cachedDid: string | null = null;

function getDid(): string {
  if (cachedDid) return cachedDid;

  let rawId = "";
  try {
    if (platform() === "darwin") {
      const output = execSync("ioreg -rd1 -c IOPlatformExpertDevice", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      const match = output.match(/IOPlatformUUID"\s*=\s*"([^"]+)"/);
      rawId = match?.[1] || "";
    } else {
      rawId = readFileSync("/etc/machine-id", "utf-8").trim();
    }
  } catch {
    try {
      rawId = execSync("hostname", { encoding: "utf-8" }).trim();
    } catch {
      rawId = "unknown";
    }
  }

  const hash = createHash("md5").update(rawId).digest("hex");
  cachedDid = (hash.replace(/[^0-9]/g, "") + "0000000000000000000").slice(
    0,
    19,
  );
  return cachedDid;
}

const TOOL_NAME_MAP: Record<string, string> = {
  "claude-code": "claude",
};

export function track(type: string): void {
  try {
    const did = getDid();
    const nowMs = Date.now();
    const nowS = Math.floor(nowMs / 1000);
    const sid = `${nowMs}-${Math.random().toString(36).slice(2, 10)}`;
    const tz = -(new Date().getTimezoneOffset() / 60);
    const tzOffset = new Date().getTimezoneOffset() * 60;

    const url =
      process.env.ARK_TEA_URL ||
      `${TEA_CONFIG.url}?aid=${TEA_CONFIG.aid}&sdk_version=${TEA_CONFIG.sdkVersion}&device_platform=cli`;

    const payload = JSON.stringify([
      {
        events: [
          {
            event: "ark_cli_lifecycle",
            params: JSON.stringify({ type }),
            local_time_ms: nowMs,
            session_id: sid,
          },
        ],
        user: {
          user_unique_id: did,
          web_id: did,
          device_id: did,
        },
        header: {
          app_id: TEA_CONFIG.aid,
          os_name: platform() === "darwin" ? "Darwin" : platform(),
          os_version: release(),
          platform: "cli",
          sdk_lib: "js",
          sdk_version: TEA_CONFIG.sdkVersion,
          timezone: tz,
          tz_offset: tzOffset,
        },
        local_time: nowS,
        verbose: 1,
      },
    ]);

    const child = spawn(
      "curl",
      [
        "-s",
        "-o",
        "/dev/null",
        "--max-time",
        "5",
        "-X",
        "POST",
        url,
        "-H",
        "Content-Type: application/json; charset=UTF-8",
        "-d",
        payload,
      ],
      { detached: true, stdio: "ignore" },
    );
    child.unref();
  } catch {
    // fire-and-forget
  }
}

export function trackToolEvent(
  action: "set" | "unset",
  toolName: string,
): void {
  const mapped = TOOL_NAME_MAP[toolName] || toolName;
  track(`${action}_${mapped}`);
}
