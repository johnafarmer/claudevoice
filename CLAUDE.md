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

- **Approval prompt handling**: Lines 197-217 detect approval prompts and set `recentApproval` flag
- **Garbage filtering**: Lines 132-142 filter out patterns like "99", "2k1a", "1004l" that appear after approval prompts
- **Text processing**: Lines 90-167 handle text extraction, cleaning, and queuing for TTS
- **Voice configuration**: Stored in `~/.claudevoice-config.json`
- **Repetition tracking**: Lines 170 and 208-220 track repeated "2k1a" patterns with `garbageRepetitionCount`

## Known Issues

### "2k1a" Repetition Issue
After approval prompts, Claude CLI sometimes outputs garbage text, particularly the pattern "2k1a" repeated multiple times followed by "g". The tool has enhanced filtering logic to handle these patterns:

- **Approval detection**: Lines 282-293 detect approval prompts and lines 187-203 detect approval options
- **Garbage filtering**: Lines 208-233 filter out various junk patterns that appear after approval prompts
- **Stage tracking**: Uses `approvalStage` variable to track approval flow (0=none, 1=prompt detected, 2=options shown)
- **Repetition counter**: `garbageRepetitionCount` tracks repeated "2k1a" patterns and extends timeout when detected
- **Enhanced patterns**: Catches variations including:
  - Simple patterns: "99", "2k1a", "1004l", "g"
  - Terminal sequences: "?1004l", "1004l99"
  - Repetitions: "2k1a 2k1a 2k1a 2k1a g" (via pattern `/^((2k1a|two\s*k\s*one\s*a)\s*)+g?$/i`)
  - Phonetic variations: "two k one a"
- **Tool message filtering**: Lines 67-80 define `isToolRelatedMessage()` function that filters out tool-related messages

### Debugging the Issue
To debug the "2k1a" issue:

1. **Use the debug capture script**:
   ```bash
   ./debug-capture.sh "create a new file test.txt"
   ```
   This captures raw terminal output for analysis.

2. **Use the enhanced version with debug mode**:
   ```bash
   CLAUDEVOICE_DEBUG=1 ./claudevoice-enhanced.js "your command"
   ```
   This logs all filtered content to help identify patterns.

3. **Test the filters**:
   ```bash
   node analyze-filters.js
   ```
   This tests the garbage detection patterns.

If new garbage patterns appear, add them to the regex checks in lines 208-233 of the `claudevoice` file.

### Solution Summary
The improvements made to handle the "2k1a" issue:

1. **Added repetition tracking**: `garbageRepetitionCount` variable tracks how many times we see "2k1a" patterns
2. **Extended timeout**: When repetitions are detected, the approval timeout extends to 15 seconds (from 8 seconds)
3. **Enhanced pattern matching**: Added specific regex `/^((2k1a|two\s*k\s*one\s*a)\s*)+g?$/i` to catch repeated patterns
4. **Early detection**: Checks for single "2k1a" instances and returns immediately before they can be spoken

These changes should prevent the TTS from speaking the "2k1a" repetitions that occur after approval prompts.

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