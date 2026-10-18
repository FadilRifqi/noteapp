use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};

use futures_util::StreamExt;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WindowEvent,
};
use tauri_plugin_autostart::ManagerExt as AutostartManagerExt;
use tauri_plugin_sql::{Migration, MigrationKind};
use zbus::MatchRule;

static QUITTING: AtomicBool = AtomicBool::new(false);

const SHORTCUT_COMPONENT: &str = "io.archnote";
const SHORTCUT_ACTION: &str = "toggle";
const META_N: i32 = 0x1000_0000 | 0x4e;

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|error| error.to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|error| error.to_string())
}

#[derive(serde::Serialize)]
struct SystemFont {
    family: String,
    weight: u16,
}

fn normalize_family(raw: &str) -> String {
    let output = std::process::Command::new("fc-match")
        .args(["--format=%{family[0]}", raw])
        .output();
    match output {
        Ok(result) if result.status.success() => {
            let family = String::from_utf8_lossy(&result.stdout).trim().to_string();
            if family.is_empty() {
                raw.to_string()
            } else {
                family
            }
        }
        _ => raw.to_string(),
    }
}

#[tauri::command]
fn system_font() -> SystemFont {
    let mut family = String::from("system-ui");
    let mut weight: u16 = 400;

    if let Ok(contents) = std::fs::read_to_string(home_dir().join(".config/kdeglobals")) {
        let mut in_general = false;
        for line in contents.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with('[') && trimmed.ends_with(']') {
                in_general = trimmed == "[General]";
                continue;
            }
            if !in_general {
                continue;
            }
            if let Some(value) = trimmed.strip_prefix("font=") {
                let parts: Vec<&str> = value.split(',').collect();
                if let Some(raw_family) = parts.first() {
                    family = normalize_family(raw_family.trim());
                }
                if let Some(raw_weight) = parts.get(4) {
                    weight = raw_weight.trim().parse().unwrap_or(400);
                }
                break;
            }
        }
    }

    SystemFont { family, weight }
}

#[tauri::command]
fn list_font_families() -> Vec<String> {
    let output = std::process::Command::new("fc-list")
        .args([":", "family"])
        .output();
    let mut families: Vec<String> = Vec::new();
    if let Ok(result) = output {
        for line in String::from_utf8_lossy(&result.stdout).lines() {
            for family in line.split(',') {
                let name = family.trim();
                if !name.is_empty() {
                    families.push(name.to_string());
                }
            }
        }
    }
    families.sort_by_key(|name| name.to_lowercase());
    families.dedup();
    families
}

fn home_dir() -> PathBuf {
    std::env::var("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("/tmp"))
}

fn kwin_rules_path() -> PathBuf {
    home_dir().join(".config/kwinrulesrc")
}

fn app_desktop_file() -> Result<PathBuf, String> {
    let exe = std::env::current_exe().map_err(|error| error.to_string())?;
    let dir = home_dir().join(".local/share/applications");
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let path = dir.join(format!("{SHORTCUT_COMPONENT}.desktop"));
    let contents = format!(
        "[Desktop Entry]\nType=Application\nName=Archnote\nComment=Temporary notes scratchpad\nExec={} --toggle\nIcon=archnote\nTerminal=false\nCategories=Utility;TextEditor;\nStartupNotify=false\n",
        exe.display()
    );
    if std::fs::read_to_string(&path).unwrap_or_default() != contents {
        std::fs::write(&path, contents).map_err(|error| error.to_string())?;
    }

    // Wayland app id association: KWin matches the window to this desktop file
    // via StartupWMClass, which is where the panel/task manager icon comes from.
    let assoc_path = dir.join("archnote.desktop");
    let assoc_contents = format!(
        "[Desktop Entry]\nType=Application\nName=Archnote\nComment=Temporary notes scratchpad\nExec={} --toggle\nIcon=archnote\nTerminal=false\nCategories=Utility;TextEditor;\nStartupNotify=false\nStartupWMClass=archnote\nNoDisplay=true\n",
        exe.display()
    );
    if std::fs::read_to_string(&assoc_path).unwrap_or_default() != assoc_contents {
        std::fs::write(&assoc_path, assoc_contents).map_err(|error| error.to_string())?;
    }
    Ok(path)
}

fn show_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn toggle_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let visible = window.is_visible().unwrap_or(false);
    let focused = window.is_focused().unwrap_or(false);
    if visible && focused {
        let _ = window.hide();
    } else {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

async fn register_global_shortcut(app: AppHandle) {
    let action_id = vec![
        SHORTCUT_COMPONENT.to_string(),
        SHORTCUT_ACTION.to_string(),
        "Archnote".to_string(),
        "Show or hide Archnote".to_string(),
    ];

    let connection = match zbus::Connection::session().await {
        Ok(connection) => connection,
        Err(error) => {
            eprintln!("archnote: cannot reach the session bus: {error}");
            return;
        }
    };

    let registered = connection
        .call_method(
            Some("org.kde.kglobalaccel"),
            "/kglobalaccel",
            Some("org.kde.KGlobalAccel"),
            "doRegister",
            &(action_id.clone(),),
        )
        .await;
    if let Err(error) = registered {
        eprintln!("archnote: global shortcut registration failed: {error}");
        return;
    }

    // flags: NoAutoloading, the binding is applied explicitly below.
    let applied = connection
        .call_method(
            Some("org.kde.kglobalaccel"),
            "/kglobalaccel",
            Some("org.kde.KGlobalAccel"),
            "setShortcut",
            &(action_id.clone(), vec![META_N], 3u32),
        )
        .await;
    match applied {
        Ok(reply) => {
            let reply: zbus::Message = reply;
            println!("archnote: shortcut set, KGlobalAccel replied: {:?}", reply.body().deserialize::<(Vec<i32>,)>());
        }
        Err(error) => eprintln!("archnote: could not set Super+N: {error}"),
    }

    let rule: MatchRule = match "type='signal',interface='org.kde.kglobalaccel.Component',member='globalShortcutPressed'".try_into() {
        Ok(rule) => rule,
        Err(error) => {
            eprintln!("archnote: could not build shortcut match rule: {error}");
            return;
        }
    };

    let mut stream = match zbus::MessageStream::for_match_rule(rule, &connection, Some(8)).await {
        Ok(stream) => stream,
        Err(error) => {
            eprintln!("archnote: could not listen for the shortcut: {error}");
            return;
        }
    };

    while let Some(message) = stream.next().await {
        let Ok(message) = message else { continue };
        let body: zbus::Result<(String, String, i64)> = message.body().deserialize();
        if let Ok((_component, action, _timestamp)) = body {
            if action == SHORTCUT_ACTION {
                println!("archnote: global shortcut activated");
                toggle_window(&app);
            }
        }
    }
}

// Minimal KConfig reader/writer for kwinrulesrc: keeps unknown keys and groups.
fn read_kwin_rules() -> (Vec<String>, Vec<(String, Vec<(String, String)>)>) {
    let mut order: Vec<String> = Vec::new();
    let mut groups: Vec<(String, Vec<(String, String)>)> = Vec::new();
    let Ok(contents) = std::fs::read_to_string(kwin_rules_path()) else {
        return (order, groups);
    };
    let mut current: Option<(String, Vec<(String, String)>)> = None;
    for line in contents.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('[') && trimmed.ends_with(']') && trimmed.len() > 2 {
            if let Some(group) = current.take() {
                groups.push(group);
            }
            let name = trimmed[1..trimmed.len() - 1].to_string();
            if name == "General" {
                order.clear();
            }
            current = Some((name, Vec::new()));
        } else if let Some((_, entries)) = current.as_mut() {
            if let Some((key, value)) = trimmed.split_once('=') {
                entries.push((key.trim().to_string(), value.to_string()));
            }
        }
    }
    if let Some(group) = current.take() {
        groups.push(group);
    }
    order = groups.iter().map(|(name, _)| name.clone()).collect();
    (order, groups)
}

fn write_kwin_rules(groups: &[(String, Vec<(String, String)>)]) {
    let mut out = String::new();
    for (name, entries) in groups {
        out.push('[');
        out.push_str(name);
        out.push_str("]\n");
        for (key, value) in entries {
            out.push_str(key);
            out.push('=');
            out.push_str(value);
            out.push('\n');
        }
        out.push('\n');
    }
    let path = kwin_rules_path();
    if let Ok(mut file) = std::fs::File::create(&path) {
        let _ = file.write_all(out.as_bytes());
    }
}

async fn reconfigure_kwin() {
    if let Ok(connection) = zbus::Connection::session().await {
        let _ = connection
            .call_method(
                Some("org.kde.KWin"),
                "/KWin",
                Some("org.kde.KWin"),
                "reconfigure",
                &(),
            )
            .await;
    }
    tokio::time::sleep(std::time::Duration::from_millis(350)).await;
}

fn pin_rule_entries(note_id: &str, index: usize) -> Vec<(String, String)> {
    vec![
        (
            "Description".to_string(),
            format!("Archnote pinned note {}", &note_id[..8.min(note_id.len())]),
        ),
        ("below".to_string(), "true".to_string()),
        ("belowrule".to_string(), "2".to_string()),
        ("positionrule".to_string(), "4".to_string()),
        (
            "position".to_string(),
            format!("{},{}", 140 + index as i32 * 36, 150 + index as i32 * 36),
        ),
        ("sizerule".to_string(), "4".to_string()),
        ("size".to_string(), "300,240".to_string()),
        ("title".to_string(), format!("archnote-pin:{}", note_id)),
        ("titlematch".to_string(), "1".to_string()),
        ("types".to_string(), "1".to_string()),
        ("skiptaskbar".to_string(), "true".to_string()),
        ("skiptaskbarrule".to_string(), "2".to_string()),
        ("skippager".to_string(), "true".to_string()),
        ("skippagerrule".to_string(), "2".to_string()),
        ("skipswitcher".to_string(), "true".to_string()),
        ("skipswitcherrule".to_string(), "2".to_string()),
    ]
}

fn is_pin_rule_group(name: &str) -> bool {
    uuid_like(name)
}

fn uuid_like(value: &str) -> bool {
    value.len() == 36
        && value.chars().enumerate().all(|(i, c)| match i {
            8 | 13 | 18 | 23 => c == '-',
            _ => c.is_ascii_hexdigit(),
        })
}

#[tauri::command]
async fn sync_pin_rules(note_ids: Vec<String>) -> Result<(), String> {
    let (_order, groups) = read_kwin_rules();
    let pinned: Vec<String> = groups
        .iter()
        .filter(|(_, entries)| {
            entries
                .iter()
                .any(|(key, value)| key == "title" && value.starts_with("archnote-pin:"))
        })
        .map(|(name, _)| name.clone())
        .collect();

    let mut general: Option<Vec<(String, String)>> = None;
    let mut others: Vec<(String, Vec<(String, String)>)> = Vec::new();
    let mut pinned_groups: Vec<(String, Vec<(String, String)>)> = Vec::new();

    let wanted: Vec<String> = note_ids
        .iter()
        .filter(|id| is_pin_rule_group(id))
        .cloned()
        .collect();

    for (name, entries) in groups {
        if name == "General" {
            general = Some(entries);
        } else if pinned.contains(&name) || wanted.contains(&name) {
            if wanted.contains(&name) {
                let index = wanted.iter().position(|id| id == &name).unwrap_or(0);
                let existing_position = entries.iter().find(|(k, _)| k == "position").cloned();
                let existing_size = entries.iter().find(|(k, _)| k == "size").cloned();
                let mut rule = pin_rule_entries(&name, index);
                if let Some(existing_position) = existing_position {
                    if let Some(slot) = rule.iter_mut().find(|(k, _)| k == "position") {
                        *slot = existing_position;
                    }
                }
                if let Some(existing_size) = existing_size {
                    if let Some(slot) = rule.iter_mut().find(|(k, _)| k == "size") {
                        *slot = existing_size;
                    }
                }
                pinned_groups.push((name, rule));
            }
        } else {
            others.push((name, entries));
        }
    }

    for id in &wanted {
        if !pinned_groups.iter().any(|(name, _)| name == id) {
            pinned_groups.push((id.clone(), pin_rule_entries(id, pinned_groups.len())));
        }
    }

    let rule_order: Vec<String> = pinned_groups
        .iter()
        .map(|(name, _)| name.clone())
        .chain(others.iter().map(|(name, _)| name.clone()))
        .collect();

    let mut general_entries: Vec<(String, String)> = general.unwrap_or_default();
    general_entries.retain(|(key, _)| key != "count" && key != "rules");
    general_entries.insert(0, ("count".to_string(), rule_order.len().to_string()));
    general_entries.insert(1, ("rules".to_string(), rule_order.join(",")));

    let mut merged: Vec<(String, Vec<(String, String)>)> =
        vec![("General".to_string(), general_entries)];
    merged.extend(pinned_groups);
    merged.extend(others);
    write_kwin_rules(&merged);
    reconfigure_kwin().await;
    Ok(())
}

#[tauri::command]
async fn remove_pin_rule(note_id: String) -> Result<(), String> {
    // Let KWin finish persisting remembered geometry before rewriting the file.
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    let (_order, groups) = read_kwin_rules();
    let mut merged: Vec<(String, Vec<(String, String)>)> = Vec::new();
    let mut removed = false;
    for (name, entries) in groups {
        if name == note_id {
            removed = true;
            continue;
        }
        merged.push((name, entries));
    }
    if removed {
        let rule_order: Vec<String> = merged
            .iter()
            .filter(|(name, _)| name != "General")
            .map(|(name, _)| name.clone())
            .collect();
        if let Some(general) = merged.iter_mut().find(|(name, _)| name == "General") {
            general.1.retain(|(key, _)| key != "count" && key != "rules");
            general
                .1
                .insert(0, ("count".to_string(), rule_order.len().to_string()));
            general.1.insert(1, ("rules".to_string(), rule_order.join(",")));
        }
        write_kwin_rules(&merged);
        reconfigure_kwin().await;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_notes",
            sql: "CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL DEFAULT '',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER
            );
            CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(deleted_at);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_pinned",
            sql: "ALTER TABLE notes ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let toggle = args.iter().any(|arg| arg == "--toggle");
            if toggle {
                toggle_window(app);
            } else {
                show_window(app);
            }
        }))
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:archnote.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .invoke_handler(tauri::generate_handler![
            write_text_file,
            read_text_file,
            system_font,
            list_font_families,
            sync_pin_rules,
            remove_pin_rule
        ])
        .setup(|app| {
            if let Err(error) = app.autolaunch().enable() {
                eprintln!("archnote: could not enable autostart: {error}");
            }
            if let Ok(path) = app_desktop_file() {
                println!("archnote: desktop entry at {}", path.display());
            }

            let start_hidden = std::env::args().any(|arg| arg == "--hidden");
            if start_hidden {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(register_global_shortcut(handle));

            let show_item = MenuItem::with_id(app, "show", "Show / Hide", true, None::<&str>)?;
            let new_item = MenuItem::with_id(app, "new", "New Note", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Archnote", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &new_item, &separator, &quit_item])?;

            let icon = app
                .default_window_icon()
                .cloned()
                .expect("archnote: missing default window icon");

            TrayIconBuilder::with_id("main")
                .icon(icon)
                .tooltip("Archnote")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => toggle_window(app),
                    "new" => {
                        show_window(app);
                        let _ = app.emit("menu://new-note", ());
                    }
                    "quit" => {
                        QUITTING.store(true, Ordering::SeqCst);
                        let app = app.clone();
                        tauri::async_runtime::spawn(async move {
                            for (_label, window) in app.webview_windows() {
                                if window.label().starts_with("pin-") {
                                    let _ = window.destroy();
                                }
                            }
                            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                            app.exit(0);
                        });
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label().starts_with("pin-") {
                    return;
                }
                if !QUITTING.load(Ordering::SeqCst) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running archnote");
}
