# Claude Code Terminal Output Patterns

This document describes the various output patterns that Claude Code produces in the terminal, based on database analysis and known behaviors.

## 1. Bullet Point Patterns (⏺)

The ⏺ bullet is used by Claude Code to mark explanatory text in terminal output. This is the primary marker ClaudeVoice uses to identify text that should be spoken.

### Expected Format:
```
⏺ I'll help you create a new React component
⏺ Let me first check the existing structure
⏺ Now I'll create the component file with the proper imports
```

## 2. Tool Execution Output

### Bash Command Output:
```
Running command: ls -la
total 48
drwxr-xr-x  12 user  staff   384 Jun 22 10:00 .
drwxr-xr-x  20 user  staff   640 Jun 22 09:55 ..
-rw-r--r--   1 user  staff  1234 Jun 22 10:00 file.txt
```

### File Read Output:
```
Reading file: /path/to/file.js
     1→const express = require('express');
     2→const app = express();
     3→
     4→app.get('/', (req, res) => {
     5→  res.send('Hello World!');
     6→});
```

### Edit/Write Confirmation:
```
✓ Successfully edited file: /path/to/file.js
✓ File created successfully at: /path/to/new-file.js
```

## 3. Approval Prompt Patterns

### Standard Approval Format:
```
Do you want to proceed with this change? (yes/no)
> 
```

### Terminal Garbage After Approval:
Known garbage patterns that appear after approval prompts:
- `99` - Simple numeric
- `2k1a` - Alphanumeric pattern
- `1004l` - Number with 'l' suffix
- `?1004l` - With question mark prefix
- `g` - Single character
- Combinations: `2k1a 2k1a 2k1a 2k1a g`
- Escape sequences: `\x1b[?1004l`

## 4. Plan Mode Output

### Plan Mode Entry:
```
⏺ I'm entering plan mode to break down this complex task
⏺ Here's my plan:

1. First, I'll analyze the existing codebase structure
2. Then, I'll identify the components that need refactoring
3. Next, I'll create a migration strategy
4. Finally, I'll implement the changes incrementally

⏺ Let me start by examining the codebase
```

### Plan Mode Exit:
```
⏺ I've completed my analysis and I'm ready to proceed with the implementation
⏺ Would you like me to start making these changes?
```

## 5. Todo List Output

### Todo Creation/Update:
```
⏺ I'll create a todo list to track our progress on this project

✓ Updated todo list:
  [✓] Set up project structure
  [→] Implement authentication system
  [ ] Create API endpoints
  [ ] Add frontend components
```

### Todo Status Indicators:
- `[ ]` - Pending
- `[→]` - In progress
- `[✓]` - Completed

## 6. Error Messages

### Tool Errors:
```
✗ Error: File not found: /path/to/missing-file.js
✗ Error: Command failed with exit code 1
✗ Error: Permission denied
```

### Recoverable Errors:
```
⏺ I encountered an error while trying to read the file
⏺ Let me try a different approach
```

## 7. Progress Indicators

### Long Operations:
```
⏺ Installing dependencies...
[████████████████████████████████████████] 100%
✓ Installation complete
```

### Multi-step Operations:
```
⏺ Running tests...
  ✓ Unit tests passed (42/42)
  ✓ Integration tests passed (15/15)
  ✓ E2E tests passed (8/8)
```

## 8. Terminal Control Sequences

Common escape sequences that might appear:
- `\x1b[2K` - Clear line
- `\x1b[1A` - Move cursor up
- `\x1b[?1004h` - Enable bracketed paste mode
- `\x1b[?1004l` - Disable bracketed paste mode
- `\x1b[0m` - Reset text formatting

## 9. MCP Tool Output

### MCP Tool Invocation:
```
⏺ I'll use the Asana MCP to fetch your tasks
Invoking mcp__asana_list_tasks...
```

### MCP Results:
```
✓ Found 5 tasks:
  • Update documentation (Due: Tomorrow)
  • Fix login bug (Due: Today)
  • Review pull requests (Due: This week)
```

## 10. Compact Mode Output

In compact mode, output is more condensed:
```
⏺ Created component.jsx with React boilerplate
⏺ Added routing configuration
⏺ Updated package.json dependencies
```

## Filtering Recommendations for ClaudeVoice

### Primary Filters:
1. **Extract lines starting with ⏺** for TTS
2. **Skip approval prompts** and their responses
3. **Filter garbage patterns**: 99, 2k1a, 1004l, etc.
4. **Remove escape sequences**: \x1b[...]
5. **Skip tool execution headers**: "Running command:", "Reading file:", etc.

### Secondary Filters:
1. **Preserve important status messages** (✓, ✗)
2. **Handle multi-line explanations** that start with ⏺
3. **Clean up formatting artifacts** from terminal output
4. **Remove progress bars and spinners**

### Context Preservation:
- Keep error explanations that follow ⏺
- Maintain logical flow of explanations
- Preserve numbered lists and bullet points within ⏺ text
- Handle code snippets gracefully (mention them but don't read them)

This pattern guide should help in refining ClaudeVoice's filtering logic to provide clean, natural TTS output while preserving all important information from Claude Code's responses.