#!/bin/bash

# Simple capture method that should work on any system

echo "=== Simple Terminal Capture ==="
echo ""
echo "This will capture Claude output to files for analysis"
echo ""

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p terminal-captures

# Just redirect output to a file
echo "Starting capture to: terminal-captures/capture_$TIMESTAMP.log"
echo "Run your Claude/cvt commands, then press Ctrl+C when done"
echo ""
echo "Suggested tests:"
echo "1. cvt 'What is 2+2?'"
echo "2. cvt 'Create a file test.txt'"
echo "3. Keep going until auto-compact triggers!"
echo ""
echo "Starting in 3 seconds..."
sleep 3

# Capture everything with tee so you can see it AND save it
echo "=== CAPTURE STARTED AT $(date) ===" > terminal-captures/capture_$TIMESTAMP.log
echo "Recording... (Ctrl+C to stop)"

# This captures your terminal session
exec 2>&1
while true; do
    echo -n "capture$ "
    read -r cmd
    echo "$ $cmd" >> terminal-captures/capture_$TIMESTAMP.log
    if [[ "$cmd" == "exit" ]]; then
        break
    fi
    # Execute and capture output
    eval "$cmd" 2>&1 | tee -a terminal-captures/capture_$TIMESTAMP.log
done

echo ""
echo "Capture saved to: terminal-captures/capture_$TIMESTAMP.log"
echo "You can analyze it with:"
echo "  cat terminal-captures/capture_$TIMESTAMP.log"
echo "  grep -E '(99|2k1a|1004l|⏺)' terminal-captures/capture_$TIMESTAMP.log"