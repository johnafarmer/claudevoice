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

## Known Issues

After approval prompts, Claude CLI sometimes outputs garbage text containing patterns like "99", "1004l99", "1a2k", etc. The tool has enhanced filtering logic to handle these patterns:

- **Approval detection**: Lines 266-275 detect approval prompts and lines 172-177 detect approval options
- **Garbage filtering**: Lines 191-201 filter out various junk patterns that appear after approval prompts
- **Stage tracking**: Uses `approvalStage` variable to track approval flow (0=none, 1=prompt detected, 2=options shown)
- **Enhanced patterns**: Now catches variations like "1004l99" with regex patterns on lines 195, 198, and 200

If new garbage patterns appear, add them to the regex checks in lines 193-201 of the `claudevoice` file.

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