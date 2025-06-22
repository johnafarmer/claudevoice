# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ClaudeVoice is a Node.js wrapper around Claude CLI that adds text-to-speech (TTS) functionality using Edge-TTS neural voices. The tool filters Claude's output to speak only explanatory text while preserving the full visual terminal experience.

## Quick Reference Commands

**Installation & Setup:**
```bash
# Automated installation (recommended)
./install.sh

# Manual installation  
npm install -g node-edge-tts
chmod +x claudevoice
sudo cp claudevoice /usr/local/bin/

# Create cv alias
sudo ln -sf /usr/local/bin/claudevoice /usr/local/bin/cv
```

**Testing & Development:**
```bash
# Run demo
./demo.sh

# Test directly
./claudevoice "explain this code"
# or use the cv alias
cv "what is 2+2?"

# Test voice changes
cv --list-voices
cv --voice 10  # British accent
cv --voice 13  # Aria (female voice)

# Test filtering (for development)
./test-filters.sh

# Debug terminal output capture
./debug-capture.sh "your command"

# Test compact mode handling
./test-compact.sh
```

**User Commands During Session:**
- `//stfu` or `cvstfu!` - Immediately stop TTS output
- `/compact` - Claude's compact mode (TTS auto-pauses during compaction)

## Architecture

The entire application is a single Node.js script (`claudevoice`) that:
1. Spawns Claude CLI using `/usr/bin/script` to maintain proper TTY behavior
2. Intercepts stdout line-by-line, filtering for explanatory text (marked with ⏺ bullets)
3. Queues filtered text for TTS playback using node-edge-tts
4. Handles approval prompts and filters terminal artifacts

### Core Components

**Main Process Flow (`claudevoice:452-490`):**
- Uses `/usr/bin/script` wrapper to maintain TTY compatibility
- Processes stdout data in chunks, splitting by newlines
- Passes through all visual output unchanged while filtering for TTS

**Text Filtering (`processLine` function, `claudevoice:227-369`):**
- Detects ⏺ bullet markers for Claude's explanatory text
- Filters out terminal control sequences, approval prompts, and garbage patterns
- Handles `/compact` mode detection to avoid re-reading conversation history
- Skips tool-related messages and todo list content

**TTS Queue Management (`claudevoice:140-196`):**
- Maintains audio queue with deduplication (via `spokenMessages` Set)
- Plays audio files sequentially using platform-specific players
- Handles interrupt commands (`//stfu`, `cvstfu!`) to stop playback immediately

**Voice Configuration (`claudevoice:45-65`):**
- 15 pre-configured Edge-TTS neural voices
- Config persisted in `~/.claudevoice-config.json`
- Voice selection via `--voice <number>` command

## Key Implementation Details

- **Approval prompt bypassing**: The tool now completely bypasses all approval-related content to avoid garbage output
- **Garbage filtering**: Enhanced filtering for patterns like "99", "2k1a", "1004l", "?1004l" that can appear in terminal output
- **Text processing**: Lines handle text extraction, cleaning, and queuing for TTS
- **Voice configuration**: Stored in `~/.claudevoice-config.json`
- **Simplified processing**: Removed approval tracking logic for cleaner, more reliable output
- **Deduplication**: Prevents speaking the same content multiple times using a Set-based approach

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

## Development Workflow

### Making Changes to ClaudeVoice

1. **Modifying the main script**: Edit `claudevoice` directly. No build process needed.

2. **Testing changes locally**:
   ```bash
   # Test without installing
   ./claudevoice "test command"
   
   # Install locally for system-wide testing
   chmod +x claudevoice
   sudo cp claudevoice /usr/local/bin/
   ```

3. **Adding new garbage patterns**: Update the regex patterns in `processLine()` function around line 300-310.

4. **Testing edge cases**:
   - Approval prompts: Test commands that require file access
   - Compact mode: Use `/compact` command and verify TTS pauses
   - Interrupt handling: Test `//stfu` during long outputs

### Common Issues and Solutions

- **"node-edge-tts not found"**: The script searches multiple locations (lines 23-30). Add new paths if needed.
- **No audio on Linux**: Ensure `mpg123` is installed (`sudo apt-get install mpg123`)
- **Duplicate speech**: Check the `spokenMessages` Set logic (lines 174-195)

### Project File Structure

```
claudevoice/
├── claudevoice          # Main executable script
├── install.sh          # Automated installer
├── demo.sh            # Interactive demo
├── test-filters.sh    # Filter testing script
├── test-compact.sh    # Compact mode testing
├── debug-capture.sh   # Terminal output debugging
├── CLAUDE.md          # This file
├── README.md          # User documentation
└── package.json       # NPM package info
```