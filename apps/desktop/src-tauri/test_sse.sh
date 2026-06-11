#!/bin/bash
# Quick diagnostic: send a streaming Anthropic request to the proxy and dump raw SSE output
echo "=== Testing KeyKing Anthropic SSE Proxy ==="
echo "Sending request to http://127.0.0.1:8787/v1/messages ..."
echo ""

curl -sN http://127.0.0.1:8787/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: test" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 200,
    "stream": true,
    "messages": [
      {"role": "user", "content": "Say hello in one sentence."}
    ]
  }' 2>&1 | head -100

echo ""
echo "=== Done ==="
