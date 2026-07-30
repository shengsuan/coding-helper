use serde_json::{json, Value};
use std::path::PathBuf;
use std::process::Command;
use std::sync::OnceLock;

// GUI apps launched from Finder/Dock inherit launchd's minimal PATH, not the
// PATH a user's login shell builds up via ~/.zshrc, ~/.zprofile, etc. That
// means tools installed under ~/.local/bin, ~/.cargo/bin, Homebrew, etc. are
// invisible to exec.LookPath in the coding-helper child process even though
// they work fine from a terminal. Ask the user's login shell for its PATH
// once and pass it down to the child so tool detection matches the terminal.
fn login_shell_path() -> Option<String> {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let output = Command::new(&shell)
        .arg("-ilc")
        .arg("echo -n \"$PATH\"")
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let path = String::from_utf8(output.stdout).ok()?.trim().to_string();
    if path.is_empty() {
        None
    } else {
        Some(path)
    }
}

fn augmented_path() -> Option<String> {
    let login_path = login_shell_path()?;
    match std::env::var("PATH") {
        Ok(current) if !current.is_empty() => {
            let mut seen: std::collections::HashSet<&str> = std::collections::HashSet::new();
            let mut merged = Vec::new();
            for dir in login_path.split(':').chain(current.split(':')) {
                if !dir.is_empty() && seen.insert(dir) {
                    merged.push(dir);
                }
            }
            Some(merged.join(":"))
        }
        _ => Some(login_path),
    }
}

fn cached_augmented_path() -> Option<&'static str> {
    static PATH: OnceLock<Option<String>> = OnceLock::new();
    PATH.get_or_init(augmented_path).as_deref()
}

fn resolve_coding_helper() -> Result<PathBuf, String> {
    if let Ok(explicit) = std::env::var("CODING_HELPER_PATH") {
        let path = PathBuf::from(explicit);
        if path.is_file() {
            return Ok(path);
        }
        return Err(format!(
            "CODING_HELPER_PATH points to a missing file: {}",
            path.display()
        ));
    }

    if cfg!(debug_assertions) {
        let workspace_bin = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../bin/coding-helper");
        if workspace_bin.is_file() {
            return Ok(workspace_bin);
        }
    }

    if let Some(sibling) = sibling_of_current_exe("coding-helper") {
        return Ok(sibling);
    }

    which("coding-helper").ok_or_else(|| {
        "找不到 coding-helper 可执行文件。\n\
         请先安装 CLI（与命令行共用同一个二进制，无需重复下载）：\n\
         • npm install -g @coohu/coding-helper\n\
         • 或从 GitHub Releases 下载 coding-helper\n\
         • 或 go install ./cmd/coding-helper\n\
         也可设置环境变量 CODING_HELPER_PATH 指向二进制路径。"
            .to_string()
    })
}

fn sibling_of_current_exe(name: &str) -> Option<PathBuf> {
    let exe_dir = std::env::current_exe().ok()?.parent()?.to_path_buf();

    let candidate = exe_dir.join(name);
    if candidate.is_file() {
        return Some(candidate);
    }
    if let Some(app_parent) = exe_dir.parent().and_then(|p| p.parent()).and_then(|p| p.parent()) {
        let candidate = app_parent.join(name);
        if candidate.is_file() {
            return Some(candidate);
        }
    }

    #[cfg(windows)]
    {
        let with_exe = exe_dir.join(format!("{name}.exe"));
        if with_exe.is_file() {
            return Some(with_exe);
        }
    }
    None
}

fn which(name: &str) -> Option<PathBuf> {
    let path_var = cached_augmented_path()
        .map(str::to_string)
        .or_else(|| std::env::var("PATH").ok())?;
    for dir in std::env::split_paths(&path_var) {
        let candidate = dir.join(name);
        if candidate.is_file() {
            return Some(candidate);
        }
        #[cfg(windows)]
        {
            let with_exe = dir.join(format!("{name}.exe"));
            if with_exe.is_file() {
                return Some(with_exe);
            }
        }
    }
    None
}

#[tauri::command]
fn core_action(action: String, payload: Value) -> Result<Value, String> {
    let binary = resolve_coding_helper()?;
    let request = json!({ "action": action, "payload": payload }).to_string();
    let mut command = Command::new(&binary);
    if let Some(path) = cached_augmented_path() {
        command.env("PATH", path);
    }
    let output = command
        .arg("gui")
        .arg(&request)
        .output()
        .map_err(|error| {
            format!(
                "无法启动 coding-helper（{}）：{error}",
                binary.display()
            )
        })?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        // Prefer structured JSON error from stdout when present.
        if let Ok(response) = serde_json::from_str::<Value>(&stdout) {
            if response.get("ok").and_then(Value::as_bool) == Some(false) {
                return Err(response
                    .get("error")
                    .and_then(Value::as_str)
                    .unwrap_or("coding-helper 返回错误")
                    .to_string());
            }
        }
        return Err(if !error.is_empty() {
            error
        } else if !stdout.is_empty() {
            stdout
        } else {
            format!(
                "coding-helper 异常退出（{}）",
                output.status.code().unwrap_or(-1)
            )
        });
    }

    let response: Value = serde_json::from_slice(&output.stdout).map_err(|error| {
        format!(
            "coding-helper 返回了无效 JSON：{error}\n输出：{}",
            String::from_utf8_lossy(&output.stdout)
        )
    })?;

    if response.get("ok").and_then(Value::as_bool) == Some(true) {
        Ok(response.get("result").cloned().unwrap_or(Value::Null))
    } else {
        Err(response
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("Unknown coding-helper error")
            .to_string())
    }
}

#[tauri::command]
fn core_binary_path() -> Result<String, String> {
    resolve_coding_helper().map(|p| p.display().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![core_action, core_binary_path])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
