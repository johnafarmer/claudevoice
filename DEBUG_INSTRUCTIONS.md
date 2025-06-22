# ClaudeVoice Debug Instructions

## Quick Start

1. **Use `cvt-debug` instead of `cvt`:**
   ```bash
   ./cvt-debug "What is 2+2?"
   ```

2. **It creates 4 log files in `terminal-captures/`:**
   - `raw_*.log` - Every single byte received from terminal
   - `hex_*.log` - Hex dump to see hidden characters
   - `clean_*.log` - Text after stripping escape codes
   - `events_*.log` - Important events (garbage detected, bullets found, etc.)

## Test Everything!

Go wild with these scenarios:

### Basic Tests
```bash
./cvt-debug "What is the meaning of life?"
./cvt-debug "Explain recursion"
```

### File Operations (Triggers Approvals)
```bash
./cvt-debug "Create a new file test.py with a hello world program"
./cvt-debug "Edit test.py to add a second print statement"
./cvt-debug "Delete test.py"
```

### Todo Operations
```bash
./cvt-debug "Create a todo list for building a web app"
./cvt-debug "Update the todos - mark first item complete"
./cvt-debug "Show me the current todo list"
```

### Plan Mode
```bash
./cvt-debug "/plan Build a REST API with authentication"
# Let it present the plan, then approve/decline
```

### Error Scenarios
```bash
./cvt-debug "Read the file /does/not/exist.txt"
./cvt-debug "Run the command 'invalidcommand123'"
```

### Rapid Fire (Test State Management)
```bash
./cvt-debug "What is 1+1?"
./cvt-debug "What is 2+2?"
./cvt-debug "What is 3+3?"
```

### Long Output
```bash
./cvt-debug "List 20 Python tips"
./cvt-debug "Explain all JavaScript array methods"
```

### Tool Heavy Operations
```bash
./cvt-debug "Analyze the package.json file and suggest improvements"
./cvt-debug "Search for all TODO comments in the codebase"
```

### The Golden Test - Auto Compact!
Keep using it until you hit 100% context and trigger auto-compact. This is SUPER valuable data!

## After Testing

The debug version will show you where the logs are saved. You can then:

1. **Check what garbage was detected:**
   ```bash
   grep "GARBAGE_PATTERN" terminal-captures/events_*.log
   ```

2. **See all bullet points:**
   ```bash
   grep "⏺" terminal-captures/clean_*.log
   ```

3. **Find specific patterns:**
   ```bash
   grep -E "(99|2k1a|1004l)" terminal-captures/raw_*.log
   ```

4. **Share the logs** - Just zip up the terminal-captures folder:
   ```bash
   zip -r debug-logs.zip terminal-captures/
   ```

## What I'm Looking For

1. **Garbage patterns** - When do "99", "2k1a", "1004l" appear?
2. **Approval prompts** - What exactly happens in the terminal?
3. **Plan mode behavior** - Does it re-read old content?
4. **Compact mode** - What happens when it triggers?
5. **Any TTS issues** - What gets spoken vs what should be spoken?

## Notes While Testing

Keep notes on:
- What you HEARD vs what you SAW
- When garbage was spoken
- Any duplicate TTS
- Anything that seemed wrong

This will give us PERFECT data to fix everything once and for all!