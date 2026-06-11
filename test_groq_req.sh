#!/bin/bash
curl -i -X POST http://127.0.0.1:8787/v1/messages \
  -H "Authorization: Bearer sk-ant-api03-keyking-zero-config-AA" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-7-sonnet-20250219",
    "messages": [
      {
        "role": "user",
        "content": "hi"
      }
    ],
    "tools": [
      {
        "name": "test",
        "description": "test",
        "input_schema": {"type": "object"}
      }
    ],
    "tool_choice": {"type": "any"}
  }'
