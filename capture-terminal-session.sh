#!/bin/bash

# Advanced terminal capture for Claude Code output analysis
# This captures EVERYTHING - raw bytes, escape sequences, timing, etc.

echo "=== Claude Code Terminal Capture System ==="
echo "This will capture a complete terminal session for analysis"
echo ""

# Create debug directory
DEBUG_DIR="./terminal-captures"
mkdir -p "$DEBUG_DIR"

# Timestamp for unique filenames
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Output files
RAW_OUTPUT="$DEBUG_DIR/raw_output_$TIMESTAMP.log"
TYPESCRIPT="$DEBUG_DIR/typescript_$TIMESTAMP"
TIMING="$DEBUG_DIR/timing_$TIMESTAMP"
HEX_DUMP="$DEBUG_DIR/hexdump_$TIMESTAMP.txt"
CLEAN_TEXT="$DEBUG_DIR/clean_text_$TIMESTAMP.txt"
ANALYSIS="$DEBUG_DIR/analysis_$TIMESTAMP.md"

echo "Capture files will be saved to:"
echo "  - Raw output: $RAW_OUTPUT"
echo "  - Typescript: $TYPESCRIPT"
echo "  - Hex dump: $HEX_DUMP"
echo "  - Analysis: $ANALYSIS"
echo ""
echo "INSTRUCTIONS:"
echo "1. Run various Claude commands to capture different patterns:"
echo "   - Simple queries (cvt 'What is 2+2?')"
echo "   - File operations that trigger approvals"
echo "   - Todo operations"
echo "   - Plan mode usage"
echo "   - Commands that produce errors"
echo "2. Type 'exit' when done capturing"
echo ""
echo "Press Enter to start capture..."
read

# Start capture with script command (captures everything including escape sequences)
echo "Starting capture session..."
script -q -t 2>"$TIMING" "$TYPESCRIPT" bash -c "
echo '=== CAPTURE SESSION STARTED ==='
echo 'Run your Claude commands now...'
echo ''
PS1='capture$ '
export PS1

# Function to run and label commands
run_test() {
    echo \"\"
    echo \"### TEST: \$1 ###\"
    echo \"Running: \$2\"
    echo \"---\"
    eval \"\$2\"
    echo \"---\"
    echo \"\"
    sleep 1
}

# Run some automatic tests
run_test 'Simple query' 'claude \"What is 2+2?\"'
run_test 'With thinking mode' 'claude --thinking-mode \"Explain recursion\"'
run_test 'File creation (triggers approval)' 'claude \"Create a file test.txt with hello world\"'
run_test 'Todo creation' 'claude \"Create a todo list for building a web app\"'

echo ''
echo 'Now run your own tests, or type exit to finish...'
bash
"

echo ""
echo "Capture complete! Processing data..."

# Create hex dump for byte-level analysis
echo "Creating hex dump..."
hexdump -C "$TYPESCRIPT" > "$HEX_DUMP"

# Extract clean text (remove most escape sequences)
echo "Extracting clean text..."
cat "$TYPESCRIPT" | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' | sed 's/\x1b\][^\x07]*\x07//g' > "$CLEAN_TEXT"

# Analyze the output
echo "Analyzing patterns..."
cat > "$ANALYSIS" << 'EOF'
# Terminal Output Analysis

## File Information
EOF

echo "- Timestamp: $TIMESTAMP" >> "$ANALYSIS"
echo "- Raw size: $(wc -c < "$TYPESCRIPT") bytes" >> "$ANALYSIS"
echo "" >> "$ANALYSIS"

# Look for bullet patterns
echo "## Bullet Patterns Found" >> "$ANALYSIS"
echo '```' >> "$ANALYSIS"
grep -E "⏺|✻|✽|·" "$CLEAN_TEXT" | head -20 >> "$ANALYSIS"
echo '```' >> "$ANALYSIS"
echo "" >> "$ANALYSIS"

# Look for garbage patterns
echo "## Potential Garbage Patterns" >> "$ANALYSIS"
echo '```' >> "$ANALYSIS"
grep -E "(2k1a|1a2k|1004l|99[^0-9]|\?1004|^\[?[0-9]{1,4}[lh])" "$TYPESCRIPT" | head -20 >> "$ANALYSIS"
echo '```' >> "$ANALYSIS"
echo "" >> "$ANALYSIS"

# Look for approval patterns
echo "## Approval-Related Patterns" >> "$ANALYSIS"
echo '```' >> "$ANALYSIS"
grep -iE "(allow|permission|approval|proceed|decline)" "$CLEAN_TEXT" | head -20 >> "$ANALYSIS"
echo '```' >> "$ANALYSIS"
echo "" >> "$ANALYSIS"

# Look for escape sequences
echo "## Escape Sequence Patterns" >> "$ANALYSIS"
echo "Common escape sequences found:" >> "$ANALYSIS"
echo '```' >> "$ANALYSIS"
# Use Python to find escape sequences
python3 << 'PYTHON' >> "$ANALYSIS"
import re
with open("$TYPESCRIPT", "rb") as f:
    data = f.read()
    
# Find all escape sequences
esc_patterns = re.findall(rb'\x1b\[[^m]*[a-zA-Z]', data)
esc_unique = list(set(esc_patterns))[:20]
for seq in esc_unique:
    print(f"  {seq.hex()} -> {repr(seq)}")
PYTHON
echo '```' >> "$ANALYSIS"

echo ""
echo "Analysis complete! Files created in $DEBUG_DIR/"
echo ""
echo "To examine the captured data:"
echo "  - View analysis: cat $ANALYSIS"
echo "  - View raw output: cat $RAW_OUTPUT"
echo "  - View hex dump: less $HEX_DUMP"
echo "  - Search for patterns: grep -E 'pattern' $CLEAN_TEXT"
echo ""
echo "You can also replay the session with: scriptreplay -t $TIMING $TYPESCRIPT"