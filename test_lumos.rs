use reqwest::Client;
use serde_json::json;

#[tokio::main]
async fn main() {
    let client = Client::new();
    let url = "https://api.lumosel.vip/v1/messages";
    let api_key = "test_key";

    let payload = json!({
        "model": "claude-opus-4-8",
        "max_tokens": 1024,
        "stream": true,
        "messages": [{"role": "user", "content": "hi"}]
    });

    let req = client.post(url)
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&payload);

    let res = req.send().await.unwrap();
    let status = res.status();
    let text = res.text().await.unwrap();

    println!("STATUS: {}", status);
    println!("BODY: {}", text);
}
