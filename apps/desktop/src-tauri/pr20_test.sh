#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# KeyKing PR #20 verification — proxy runtime tests
# Usage:  export KK_KEY="<system key from dashboard>"
#         bash pr20_test.sh
# Knobs:  KK_URL (default 127.0.0.1:8787)
#         TEST_MODEL — model routing to a provider you have keys
#                      for (default: gpt-4o → OpenAI)
#         SKIP_ZEN=1 — skip Zen tests (saves 100/day quota)
# Zen quota used by this script: exactly 2 requests (T3, T4)
# ═══════════════════════════════════════════════════════════════
set -u
KK_URL="${KK_URL:-http://127.0.0.1:8787}"
KK_KEY="${KK_KEY:?export KK_KEY first (system key from KeyKing dashboard)}"
TEST_MODEL="${TEST_MODEL:-gpt-4o}"
SKIP_ZEN="${SKIP_ZEN:-0}"
PASS=0; FAIL=0; TMP=$(mktemp -d)

report() { # report <name> <0=pass|1=fail> <note>
  if [ "$2" = "0" ]; then PASS=$((PASS+1)); echo "✅ PASS  $1 — $3";
  else FAIL=$((FAIL+1)); echo "❌ FAIL  $1 — $3"; fi
}

echo "━━━ T0: proxy alive (GET /v1/models, no auth) ━━━"
curl -sS --max-time 10 "$KK_URL/v1/models" -o "$TMP/t0.json" -w "%{http_code}" > "$TMP/t0.code" 2>/dev/null
if grep -q '"data"' "$TMP/t0.json"; then report "T0" 0 "models list returned"; else report "T0" 1 "no response — is the app running?"; cat "$TMP/t0.json"; fi

echo "━━━ T1: stream WITHOUT penalty fields (400-nulls regression) ━━━"
curl -sS -N --max-time 90 -X POST "$KK_URL/v1/chat/completions" \
  -H "Authorization: Bearer $KK_KEY" -H "Content-Type: application/json" \
  -d "{\"model\":\"$TEST_MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"reply with the word ok\"}],\"stream\":true,\"max_tokens\":16}" \
  -o "$TMP/t1.txt" -w "%{http_code}" > "$TMP/t1.code" 2>/dev/null
if grep -qi 'float_type\|invalid_request_error' "$TMP/t1.txt"; then
  report "T1" 1 "STILL SENDING NULLS — upstream rejected:"; head -c 400 "$TMP/t1.txt"; echo
elif [ "$(cat "$TMP/t1.code")" = "200" ] && grep -q 'data:' "$TMP/t1.txt"; then
  report "T1" 0 "200 + SSE chunks, no null-field 400"
else
  report "T1" 1 "HTTP $(cat "$TMP/t1.code")"; head -c 400 "$TMP/t1.txt"; echo
fi

echo "━━━ T2: stream WITH penalties set (strip must keep real values) ━━━"
curl -sS -N --max-time 90 -X POST "$KK_URL/v1/chat/completions" \
  -H "Authorization: Bearer $KK_KEY" -H "Content-Type: application/json" \
  -d "{\"model\":\"$TEST_MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"reply with the word ok\"}],\"stream\":true,\"max_tokens\":16,\"temperature\":0.2,\"top_p\":0.9,\"frequency_penalty\":0.5,\"presence_penalty\":0.5}" \
  -o "$TMP/t2.txt" -w "%{http_code}" > "$TMP/t2.code" 2>/dev/null
if [ "$(cat "$TMP/t2.code")" = "200" ] && grep -q 'data:' "$TMP/t2.txt"; then
  report "T2" 0 "explicit params accepted upstream"
else
  report "T2" 1 "HTTP $(cat "$TMP/t2.code")"; head -c 400 "$TMP/t2.txt"; echo
fi

if [ "$SKIP_ZEN" != "1" ]; then
  echo "━━━ T3: Zen remap (1 Zen request) ━━━"
  echo "    requires Priority Routing rule: provider=OpencodeZen, model=$TEST_MODEL"
  curl -sS -N --max-time 90 -X POST "$KK_URL/v1/chat/completions" \
    -H "Authorization: Bearer $KK_KEY" -H "Content-Type: application/json" \
    -d "{\"model\":\"$TEST_MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"reply with the word ok\"}],\"stream\":true,\"max_tokens\":16}" \
    -o "$TMP/t3.txt" -w "%{http_code}" > "$TMP/t3.code" 2>/dev/null
  if [ "$(cat "$TMP/t3.code")" = "200" ] && grep -q 'data:' "$TMP/t3.txt" && ! grep -qi 'rate' "$TMP/t3.txt"; then
    report "T3" 0 "Zen accepted remapped model (no 429)"
  else
    report "T3" 1 "HTTP $(cat "$TMP/t3.code")"; head -c 400 "$TMP/t3.txt"; echo
  fi

  echo "━━━ T4: Claude Code path /v1/messages → Zen (1 Zen request) ━━━"
  curl -sS -N --max-time 90 -X POST "$KK_URL/v1/messages" \
    -H "Content-Type: application/json" \
    -d '{"model":"claude-sonnet-4-20250514","max_tokens":16,"stream":true,"messages":[{"role":"user","content":"reply with the word ok"}]}' \
    -o "$TMP/t4.txt" -w "%{http_code}" > "$TMP/t4.code" 2>/dev/null
  if grep -q 'message_start' "$TMP/t4.txt"; then
    report "T4" 0 "Anthropic SSE events streamed (claude→zen remap works)"
  else
    report "T4" 1 "HTTP $(cat "$TMP/t4.code")"; head -c 400 "$TMP/t4.txt"; echo
  fi
else
  echo "━━━ T3/T4 skipped (SKIP_ZEN=1) ━━━"
fi

echo "━━━ T5: deterministic 400 → passthrough, NO key rotation ━━━"
curl -sS --max-time 90 -X POST "$KK_URL/v1/chat/completions" \
  -H "Authorization: Bearer $KK_KEY" -H "Content-Type: application/json" \
  -d "{\"model\":\"$TEST_MODEL\",\"messages\":[],\"stream\":true}" \
  -o "$TMP/t5.txt" -w "%{http_code} %{time_total}" > "$TMP/t5.code" 2>/dev/null
CODE5=$(cut -d' ' -f1 "$TMP/t5.code"); TIME5=$(cut -d' ' -f2 "$TMP/t5.code")
if [ "$CODE5" = "400" ] || [ "$CODE5" = "404" ] || [ "$CODE5" = "422" ]; then
  report "T5" 0 "HTTP $CODE5 in ${TIME5}s (fast = no rotation) — upstream body: $(head -c 200 "$TMP/t5.txt")"
else
  report "T5" 1 "HTTP $CODE5 in ${TIME5}s — expected a fast 4xx with upstream body"; head -c 300 "$TMP/t5.txt"; echo
fi

echo "━━━ T6: routing log shows upstream error detail ━━━"
LOG=$(find ~/.local/share ~/.config -name "routing_log.json" 2>/dev/null | head -1)
if [ -n "$LOG" ]; then
  echo "    log: $LOG (newest 3 events):"
  head -c 1500 "$LOG"; echo
  grep -q 'request error, not retrying' "$LOG" && report "T6" 0 "4xx logged without retry" || report "T6" 1 "no 'not retrying' entry — did T5 route through the fix?"
else
  report "T6" 1 "routing_log.json not found — run: find ~ -name routing_log.json 2>/dev/null"
fi

echo "═══════════════════════════════════════════════════════════════"
echo "RESULT: $PASS passed, $FAIL failed   (artifacts in $TMP)"
