use axum::{serve, Router};
use std::sync::Arc;
use std::net::SocketAddr;
use tauri::{Emitter, Manager};

mod proxy;
mod adapters;
mod vault;
mod quota;
mod commands;

use proxy::router::ProxyRouter;
use commands::{SystemKey, VaultState};

fn generate_system_key() -> String {
    format!("kk-{}", uuid::Uuid::new_v4().to_string().replace("-", ""))
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_data_dir().expect("failed to get app data dir");
            std::fs::create_dir_all(&data_dir).ok();
            let vault = vault::Vault::new(data_dir);
            let vault_state = Arc::new(VaultState::new(vault));
            app.manage(vault_state.clone());

            let system_key = Arc::new(generate_system_key());
            app.manage(SystemKey(system_key.clone()));

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                start_proxy(handle, vault_state, system_key).await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::add_key,
            commands::remove_key,
            commands::list_keys,
            commands::validate_key,
            commands::get_api_key,
            commands::list_routing_events,
            commands::clear_routing_events,
            commands::export_vault,
            commands::open_browser,
            commands::get_routing_rules,
            commands::save_routing_rules,
            commands::get_available_models,
            commands::save_session,
            commands::get_session,
            commands::clear_session
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn start_proxy(handle: tauri::AppHandle, vault_state: Arc<VaultState>, system_key: Arc<String>) {
    let addr = SocketAddr::from(([127, 0, 0, 1], 8787));
    let fallback_addr = SocketAddr::from(([127, 0, 0, 1], 8788));

    println!("Key King system key: {}", &*system_key);
    let router = Arc::new(ProxyRouter::new(vault_state, system_key, Some(handle.clone())));
    let app = Router::new()
        .route("/v1/chat/completions", axum::routing::post(ProxyRouter::handle_chat))
        .route("/v1/models", axum::routing::get(ProxyRouter::handle_models))
        .route("/auth/callback", axum::routing::get(handle_auth_callback))
        .with_state(router);

    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(l) => l,
        Err(_) => tokio::net::TcpListener::bind(fallback_addr).await
            .expect("Cannot bind to 8787 or 8788"),
    };

    let actual_port = listener.local_addr().unwrap().port();
    println!("Key King proxy running on port {}", actual_port);

    handle.emit("proxy-started", actual_port).ok();

    serve(listener, app).await.unwrap();
}

async fn handle_auth_callback(
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
    axum::extract::State(state): axum::extract::State<Arc<ProxyRouter>>,
) -> axum::response::Html<&'static str> {
    if let Some(session_id) = params.get("session_id") {
        if let Some(user_id) = params.get("user_id") {
            if let Some(handle) = &state.app_handle {
                handle.emit("auth-success", serde_json::json!({
                    "session_id": session_id,
                    "user_id": user_id
                })).ok();
            }
        }
    }
    axum::response::Html(r#"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KeyKing Auth</title>
    <style>
        body { margin: 0; padding: 0; background-color: #0c0c0e; color: #f3f4f6; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; }
        .container { background-color: #1a1a1e; border: 1px solid rgba(255, 255, 255, 0.1); padding: 3rem; border-radius: 1rem; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); max-width: 400px; }
        .icon-wrapper { width: 4rem; height: 4rem; background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(180, 83, 9, 0.2)); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 1rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto; }
        .icon-wrapper svg { width: 2rem; height: 2rem; color: #f59e0b; }
        h1 { margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 800; background: linear-gradient(to right, #ffffff, #9ca3af); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        p { color: #9ca3af; font-size: 0.875rem; margin: 0; line-height: 1.5; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>
            </svg>
        </div>
        <h1>Authentication Successful</h1>
        <p>Your session is secure. You can safely close this window and return to the KeyKing desktop app.</p>
    </div>
    <script>setTimeout(() => { window.close(); }, 3500);</script>
</body>
</html>
"#)
}
