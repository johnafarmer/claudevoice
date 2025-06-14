#!/bin/bash

# Debug script to capture raw Claude output for analyzing the 2k1a issue

echo "=== ClaudeVoice Debug Capture ==="
echo "This script captures raw Claude output to help debug the '2k1a' looping issue"
echo ""

# Create debug directory
DEBUG_DIR="./debug-output"
mkdir -p "$DEBUG_DIR"

# Timestamp for unique filenames
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Starting capture to: $DEBUG_DIR/raw_output_$TIMESTAMP.log"
echo "Press Ctrl+C when you've reproduced the issue"
echo ""
echo "Try to trigger an approval prompt (e.g., 'claude \"create a new file test.txt\"')"
echo ""

# Run claude with script command to capture raw terminal output including escape sequences
/usr/bin/script -q "$DEBUG_DIR/raw_output_$TIMESTAMP.log" claude "$@"

echo ""
echo "Capture complete. Processing output..."

# Create a version with visible escape sequences
cat "$DEBUG_DIR/raw_output_$TIMESTAMP.log" | cat -v > "$DEBUG_DIR/visible_output_$TIMESTAMP.txt"

# Extract lines around approval prompts
echo "Extracting lines around approval prompts..."
grep -B5 -A20 -i "approval\|permission\|allow\|decline" "$DEBUG_DIR/raw_output_$TIMESTAMP.log" > "$DEBUG_DIR/approval_context_$TIMESTAMP.txt" 2>/dev/null || true

# Look for the problematic patterns
echo "Searching for problematic patterns..."
grep -E "(2k1a|1a2k|1004l|99[^0-9]|[^0-9]99$|\bg\b)" "$DEBUG_DIR/raw_output_$TIMESTAMP.log" > "$DEBUG_DIR/garbage_patterns_$TIMESTAMP.txt" 2>/dev/null || true

echo ""
echo "Debug files created:"
echo "  - Raw output: $DEBUG_DIR/raw_output_$TIMESTAMP.log"
echo "  - Visible escapes: $DEBUG_DIR/visible_output_$TIMESTAMP.txt"
echo "  - Approval context: $DEBUG_DIR/approval_context_$TIMESTAMP.txt"
echo "  - Garbage patterns: $DEBUG_DIR/garbage_patterns_$TIMESTAMP.txt"
echo ""
echo "To analyze the raw bytes around '2k1a' pattern:"
echo "  hexdump -C $DEBUG_DIR/raw_output_$TIMESTAMP.log | grep -B2 -A2 '32 6b 31 61'"