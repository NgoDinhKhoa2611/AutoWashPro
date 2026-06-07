#!/bin/bash

# Configuration
FRONTEND_PORT=5173
BACKEND_PORT=5023
FRONTEND_DIR="./frontend"
BACKEND_DIR="./backend"

# Function to find and kill process on a specified port
kill_port() {
  local port=$1
  echo -e "\033[1;33m[*] Checking for processes on port $port...\033[0m"
  
  # Find PIDs using netstat (Windows format). tr -d '\r' strips carriage returns.
  local pids=$(netstat -ano | grep -i "listening" | grep -i ":$port" | awk '{print $5}' | tr -d '\r' | sort -u)
  
  if [ -n "$pids" ]; then
    for pid in $pids; do
      if [[ "$pid" =~ ^[0-9]+$ ]] && [ "$pid" -ne 0 ]; then
        echo -e "\033[1;31m[!] Found process $pid on port $port. Killing it...\033[0m"
        # taskkill with double-slashes to prevent Git Bash from converting flags to paths
        taskkill //F //PID "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null
      fi
    done
  else
    # Fallback check for active/established connections
    pids=$(netstat -ano | grep -i ":$port" | awk '{print $5}' | tr -d '\r' | sort -u)
    if [ -n "$pids" ]; then
      for pid in $pids; do
        if [[ "$pid" =~ ^[0-9]+$ ]] && [ "$pid" -ne 0 ]; then
          echo -e "\033[1;31m[!] Found process $pid on port $port. Killing it...\033[0m"
          taskkill //F //PID "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null
        fi
      done
    else
      echo -e "\033[1;32m[✓] Port $port is free.\033[0m"
    fi
  fi
}

# 1. Kill existing processes on the ports
kill_port $FRONTEND_PORT
kill_port $BACKEND_PORT

# PIDs of background processes
BACKEND_PID=""
FRONTEND_PID=""

# Cleanup function when Ctrl+C is pressed
cleanup() {
  echo -e "\n\033[1;31m[*] Stopping all frontend and backend processes...\033[0m"
  [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
  [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null
  
  # Wait for them to exit
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
  
  # Force clean ports if any process lingered
  kill_port $FRONTEND_PORT
  kill_port $BACKEND_PORT
  echo -e "\033[1;32m[✓] All processes stopped successfully!\033[0m"
  exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# 2. Start Backend
echo -e "\033[1;34m[*] Starting Backend in $BACKEND_DIR...\033[0m"
cd "$BACKEND_DIR" || exit 1
dotnet run build &
BACKEND_PID=$!
echo -e "\033[1;32m[✓] Backend started in background with PID: $BACKEND_PID\033[0m"

# Return to root
cd - > /dev/null || exit 1

# 3. Start Frontend
echo -e "\033[1;34m[*] Starting Frontend in $FRONTEND_DIR...\033[0m"
cd "$FRONTEND_DIR" || exit 1
npm run dev &
FRONTEND_PID=$!
echo -e "\033[1;32m[✓] Frontend started in background with PID: $FRONTEND_PID\033[0m"

# Return to root
cd - > /dev/null || exit 1

# Open browser to frontend port in the background after a brief delay
(
  sleep 1.5
  echo -e "\033[1;36m[*] Opening browser to http://localhost:$FRONTEND_PORT...\033[0m"
  start "http://localhost:$FRONTEND_PORT" 2>/dev/null || cmd.exe /c start "http://localhost:$FRONTEND_PORT" 2>/dev/null || explorer "http://localhost:$FRONTEND_PORT" 2>/dev/null
) &

echo -e "\033[1;35m==================================================\033[0m"
echo -e "\033[1;32m[✓] Both applications started successfully!\033[0m"
echo -e "\033[1;36m- Frontend PID: $FRONTEND_PID (Port: $FRONTEND_PORT)\033[0m"
echo -e "\033[1;36m- Backend PID: $BACKEND_PID (Port: $BACKEND_PORT)\033[0m"
echo -e "\033[1;33m[*] Press [Ctrl + C] to stop all servers.\033[0m"
echo -e "\033[1;35m==================================================\033[0m"

# Keep the script running to monitor children and handle trap
wait

