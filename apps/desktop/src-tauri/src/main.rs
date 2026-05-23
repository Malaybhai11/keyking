use axum::{serve, Extension, Router};
use std::net::SocketAddr;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::RwLock;
use std::collections::HashMap;

mod proxy;
mod adapters;
mod vault;
mod quota;
mod commands;

use proxy::{router::ProxyRouter, NormalizedRequest};
use adapters::openai::OpenAIAdapter;
use adapters::groq::GroqAdapter;

#[tauri::command]
async fn greet(name: String) -> String {
    format!("Hello, {}! Key King is running.", name)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Spawn Axum proxy server in background
            let handle = app.handle().clone();
            tokio::spawn(async move {
                start_proxy(handle).await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, commands::add_key, commands::remove_key, commands::list_keys, commands::validate_key])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn start_proxy(handle: tauri::AppHandle) {
    let addr = SocketAddr::from(([127, 0, 0, 1], 8787));
    let fallback_addr = SocketAddr::from(([127, 0, 0, 1], 8788));
    
    let router = ProxyRouter::new();
    let app = Router::new()
        .route("/v1/chat/completions", axum::routing::post(router.handle_chat))
        .route("/v1/models", axum::routing::get(router.handle_models))
        .layer(Extension(Arc::new(RwLock::new(HashMap::<String, String>::new()))));
    
    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(l) => l,
        Err(_) => tokio::net::TcpListener::bind(fallback_addr).await.expect("Cannot bind to 8787 or 8788"),
    };
    
    let actual_port = listener.local_addr().unwrap().port();
    println!("Key King proxy running on port {}", actual_port);
    
    handle.emit("proxy-started", actual_port).ok();
    
    serve(listener, app).await.unwrap();
}
