#!/bin/bash
# ito の死活監視。VPS の cron から 5 分おきに呼ぶ (README の「本番」)。
# 応答が無いときだけ、PM2 で ito を再起動して ~/ito_heal.log に残す。
# ITO_HEAL_DRY_RUN=1 を付けると、再起動せずに判定だけを表示する。
export PATH=/usr/local/bin:/usr/bin:/bin:$PATH

PORT="${ITO_PORT:-3040}"
LOG="${ITO_HEAL_LOG:-$HOME/ito_heal.log}"
# Nginx を通さずに確かめる (Nginx や証明書の問題は、ito を再起動しても直らない)。
# Socket.io の応答で、HTTP だけでなくゲームの同期の部分も動いていることを確かめる
URL="http://127.0.0.1:${PORT}/socket.io/?EIO=4&transport=polling"

check() { curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$URL"; }

STATUS=$(check)
[ "$STATUS" = "200" ] && exit 0
# 再起動の直後などの一時的な失敗では再起動しない
sleep "${ITO_HEAL_RETRY_SECONDS:-10}"
STATUS=$(check)
[ "$STATUS" = "200" ] && exit 0

if [ -n "$ITO_HEAL_DRY_RUN" ]; then
  echo "応答なし (status=$STATUS)。再起動する (dry run なので何もしない)"
  exit 1
fi
echo "$(date '+%F %T'): 応答なし (status=$STATUS)。ito を再起動します" >> "$LOG"
pm2 restart ito >> "$LOG" 2>&1
