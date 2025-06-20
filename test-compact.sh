#!/bin/bash

echo "Starting debug capture for /compact behavior..."
echo ""
echo "1. First, we'll start Claude and ask a simple question"
echo "2. Then type /compact when Claude responds"
echo "3. Press Ctrl+C after a few seconds to exit"
echo ""
echo "Press Enter to start..."
read

# Run the debug script
./debug-compact.js "what is 2+2"