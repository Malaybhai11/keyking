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
            commands::clear_routing_events
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
