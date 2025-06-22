# Terminal Capture Guide for ClaudeVoice

## Quick Start

1. **Start the capture session:**
   ```bash
   cd /Users/git/claudevoice
   ./capture-terminal-session.sh
   ```

2. **When it says "Run your Claude commands now...", run the test suite:**
   ```bash
   ./capture-test-cases.sh
   ```

3. **After tests complete, type `exit` to end capture**

4. **Check the results:**
   ```bash
   ls -la terminal-captures/
   cat terminal-captures/analysis_*.md
   ```

## Manual Testing (Important!)

After running the automated tests, try these specific scenarios:

### Approval Prompt Garbage Test
```bash
# This should trigger approval AND the garbage patterns
claude "Create a file named approval-test.py with print('hello')"
# Watch for: 99, 2k1a, 1004l, etc.
```

### Plan Mode Re-reading Test
```bash
claude "/plan Build a chat application with WebSocket support"
# Let it present the plan
# Then approve it
# Watch if old content gets re-read
```

### Rapid Commands Test
```bash
# Fire these quickly to test state management
claude "What is 2+2?"
claude "What is 3+3?"
claude "What is 4+4?"
```

### ClaudeVoice Specific Tests
Run these WITH claudevoice active to see what gets spoken:
```bash
cvt "Create a complex data structure in Python"
# Listen for any garbage in TTS

cvt "Explain this code" < /Users/git/claudevoice/claudevoice
# Test with large input

cvt "/plan Design a mobile app"
# Test plan mode with TTS
```

## What to Look For

1. **Garbage Patterns:**
   - `99`, `2k1a`, `1004l`, `?1004l`
   - `g`, combinations like `2k1a 2k1a 2k1a g`
   - Any weird alphanumeric sequences after approvals

2. **Escape Sequences:**
   - `\x1b[` patterns
   - `]99;` sequences
   - Terminal control codes

3. **Re-reading Issues:**
   - Does /compact cause old messages to be spoken?
   - Does plan mode approval cause re-reading?
   - Are messages being duplicated?

4. **Bullet Patterns:**
   - How do ⏺ bullets appear in raw output?
   - Multi-line content after bullets
   - Spacing and formatting

## Analyzing Results

After capture, examine:

1. **Raw typescript file:** Shows EXACTLY what terminal received
   ```bash
   less terminal-captures/typescript_*
   ```

2. **Hex dump:** For finding hidden characters
   ```bash
   grep -A2 -B2 "32 6b 31 61" terminal-captures/hexdump_*  # Find "2k1a"
   ```

3. **Clean text:** What it looks like without escape codes
   ```bash
   cat terminal-captures/clean_text_*
   ```

4. **Look for patterns:**
   ```bash
   # Find all garbage patterns
   grep -E "(99|2k1a|1004l|\?1004)" terminal-captures/typescript_*
   
   # Find approval prompts
   grep -i "approval\|permission\|allow" terminal-captures/clean_text_*
   
   # Find bullets
   grep "⏺" terminal-captures/clean_text_*
   ```

## Share Results

The most useful files to analyze will be:
- `typescript_*` - Raw terminal output
- `analysis_*.md` - Automated analysis
- Your notes on what you heard vs what you saw

This data will let us build PERFECT filters!