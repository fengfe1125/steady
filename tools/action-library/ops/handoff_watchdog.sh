#!/bin/zsh
# Keeps the chest action-library run going overnight.
#   nohup tools/action-library/ops/handoff_watchdog.sh >/dev/null 2>&1 &
# Claude refreshes ops/heartbeat each loop. If it is stale > STALE s, Codex takes over (ops/codex.lock held while it runs).
# Codex refreshes ops/codex-heartbeat each loop; if that is stale > CODEX_STALE s the Codex run is killed and restarted.
ops=${0:A:h}; repo=${ops:h:h:h}; STALE=${STALE:-2700}; CODEX_STALE=${CODEX_STALE:-3600}; log=$ops/codex-run.log
age() { echo $(( $(date +%s) - $(cat $1 2>/dev/null || echo 0) )); }
PROMPT="你现在接手这个项目（Claude 已停止或额度用完），用户在睡觉，任务不能停。请完整阅读 tools/action-library/HANDOFF.md 并严格按其中流程不断循环，一直工作、不要停：没有新结果时用 ops/watch.py 等待再继续下一轮，绝不因为“暂时没事做”而结束；A、B 完成后按 HANDOFF.md「第二轮 C：器材适配」自己规划并推进 C 批（补器材模型、验证、同步 PROMPT、开 lane、验收）；只有胸部所有 lane 都已验收才可以结束。任务由你自己安排和检查，别偷懒：每轮都要有可量化进展。循环内容：收集、自动检查、看图验收、写 reviews/chest.json、对有 ✗ 的 lane 开返工窗口、补开新 lane（同时 6~8 个窗口）。每个循环都要：1) 把当前时间（epoch 秒）写入 tools/action-library/ops/codex-heartbeat；2) 用 screencapture 截图查看 WorkBuddy，确认各窗口在跑、没有卡住（某 lane 超过 15 分钟无新 JSON 就新开窗口）、模型可用（DeepSeek 不可用就按 HANDOFF 换模型）；3) 把本轮进展追加到 tools/action-library/ops/codex-report.md。不要提交 git，不要改 tools/anatomy/engine/。"
while true; do
  if [[ -e $ops/codex.lock ]]; then
    pid=$(cat $ops/codex.lock)
    if ! kill -0 $pid 2>/dev/null; then rm -f $ops/codex.lock
    elif (( $(age $ops/codex-heartbeat) > CODEX_STALE && $(age $ops/codex.lock.t) > CODEX_STALE )); then
      echo "$(date) Codex heartbeat stale: killing $pid" >> $log; pkill -P $pid; kill $pid; rm -f $ops/codex.lock
    fi
  elif (( $(age $ops/heartbeat) > STALE )); then
    echo "$(date) Claude heartbeat stale ($(age $ops/heartbeat)s): launching Codex" >> $log
    date +%s > $ops/codex.lock.t
    ( start=$(date +%s); codex exec --dangerously-bypass-approvals-and-sandbox -C $repo "$PROMPT" < /dev/null >> $log 2>&1; echo "$(date) Codex exited with $?" >> $log
      # A run that dies within a minute is almost always a usage limit: back off instead of relaunching every 2 min.
      (( $(date +%s) - start < 60 )) && { echo "$(date) short run, backing off 15 min" >> $log; sleep 900; } ) &
    echo $! > $ops/codex.lock
  fi
  sleep 120
done
