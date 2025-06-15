# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ClaudeVoice is a Node.js wrapper around Claude CLI that adds text-to-speech (TTS) functionality using Edge-TTS neural voices. The tool filters Claude's output to speak only explanatory text while preserving the full visual terminal experience.

## Commands

**Installation:**
```bash
# Automated installation
./install.sh

# Manual installation  
npm install -g node-edge-tts
chmod +x claudevoice
sudo cp claudevoice /usr/local/bin/
```

**Testing:**
```bash
# Run demo
./demo.sh

# Test directly
./claudevoice "explain this code"
```

## Architecture

The entire application is a single Node.js script (`claudevoice`) that:
1. Spawns Claude CLI using `/usr/bin/script` to maintain proper TTY behavior
2. Intercepts stdout line-by-line, filtering for explanatory text (marked with ⏺ bullets)
3. Queues filtered text for TTS playback using node-edge-tts
4. Handles approval prompts and filters terminal artifacts

## Key Implementation Details

- **Approval prompt bypassing**: The tool now completely bypasses all approval-related content to avoid garbage output
- **Garbage filtering**: Enhanced filtering for patterns like "99", "2k1a", "1004l", "?1004l" that can appear in terminal output
- **Text processing**: Lines handle text extraction, cleaning, and queuing for TTS
- **Voice configuration**: Stored in `~/.claudevoice-config.json`
- **Simplified processing**: Removed approval tracking logic for cleaner, more reliable output

## Known Issues

### Resolved: Approval Prompt Handling
The tool now completely bypasses all approval-related content instead of trying to handle it. This prevents the TTS from speaking approval prompts and avoids the subsequent garbage text issues.

**Current filtering approach**:
- **Approval content detection**: Skips any lines containing approval prompts or options
- **Garbage pattern filtering**: Filters out known patterns that can appear in terminal output:
  - Simple patterns: "99", "2k1a", "1004l", "g"
  - Terminal sequences: "?1004l", "1004l99", escape sequences with `\x1b[?1004`
  - Repetitions: "2k1a 2k1a 2k1a 2k1a g" (via pattern `/^((2k1a|two\s*k\s*one\s*a)\s*)+g?$/i`)
  - Phonetic variations: "two k one a"
  - Short alphanumeric garbage: patterns like "a99", "abc123"
- **Tool message filtering**: The `isToolRelatedMessage()` function filters out tool-related messages

### Debugging Terminal Output
If you encounter new garbage patterns in the TTS output:

1. **Use the debug capture script** (if available):
   ```bash
   ./debug-capture.sh "your command"
   ```
   This captures raw terminal output for analysis.

2. **Add new patterns to the filter**:
   The garbage filtering logic is in the `processLine` function. Add new patterns to the regex checks if needed.

3. **Test specific scenarios**:
   Test commands that trigger approval prompts to ensure they're properly bypassed.

## Recommended CLAUDE.md Addition for Projects

To optimize ClaudeVoice experience, consider adding these guidelines to your project's CLAUDE.md:

```markdown
## CRITICAL: Communication Style Guidelines

### TTS-Friendly Output Format
ALWAYS structure responses for text-to-speech compatibility by following these rules:

1. **Start with a comprehensive summary sentence** that encompasses the entire response before any formatting or lists. This first sentence should capture what was done, what's happening, or what will happen next.

2. **Never start with just "I updated the todos" or similar brief statements** - instead say something like "I've updated the todo list to track all database migration tasks as complete, marked the API endpoint refactoring as in progress, and added new items for the authentication improvements we discussed."

3. **After the summary, use normal formatting** with bullet points, code blocks, etc.

4. **Example format:**
```
I've successfully analyzed your codebase and created comprehensive documentation covering the build process, identified three areas for performance optimization in the data processing pipeline, and prepared a migration plan for the legacy components.

Here's what I accomplished:
• Updated documentation with build and test commands
• Analyzed performance bottlenecks in key modules
• Created step-by-step migration strategy
```
```

This format ensures the TTS system speaks a complete, informative sentence before encountering any formatting that might interrupt the flow.