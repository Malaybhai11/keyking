const apiKey = "test_key";
fetch("https://api.lumosel.vip/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  },
  body: JSON.stringify({
    "model": "claude-opus-4-8",
    "max_tokens": 1024,
    "stream": true,
    "messages": [{"role": "user", "content": "hi"}]
  })
}).then(res => {
  console.log("STATUS:", res.status);
  return res.text();
}).then(text => {
  console.log("BODY:", text);
});
