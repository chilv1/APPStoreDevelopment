#!/bin/bash
# Snapshot VPS resources every 5s during a load test.
# Run on local: bash tests/load/monitor/vps-watch.sh > tests/load/results/vps-watch.log
# Stop with Ctrl+C after the test finishes.
HOST=root@212.85.12.118
echo "timestamp,cpu_pct,mem_used_mb,mem_pct,load_1m,disk_busy"

while true; do
  read CPU MEM_USED MEM_TOTAL LOAD < <(
    ssh -o ConnectTimeout=5 $HOST "
      CPU=\$(top -bn1 | grep 'Cpu(s)' | awk '{print \$2 + \$4}')
      MEM=\$(free -m | awk '/Mem:/ {print \$3, \$2}')
      LOAD=\$(uptime | awk -F'load average:' '{print \$2}' | awk -F',' '{print \$1}' | xargs)
      echo \"\$CPU \$MEM \$LOAD\"
    " 2>/dev/null
  )
  TS=$(date +"%Y-%m-%d %H:%M:%S")
  if [ -n "$CPU" ] && [ -n "$MEM_USED" ] && [ -n "$MEM_TOTAL" ]; then
    MEM_PCT=$(echo "scale=1; $MEM_USED * 100 / $MEM_TOTAL" | bc)
    echo "$TS,$CPU,$MEM_USED,$MEM_PCT,$LOAD"
  fi
  sleep 5
done
