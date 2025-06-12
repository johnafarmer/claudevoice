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
- **Garbage filtering**: Lines 191-208 filter out various junk patterns that appear after approval prompts
- **Stage tracking**: Uses `approvalStage` variable to track approval flow (0=none, 1=prompt detected, 2=options shown)

If new garbage patterns appear, add them to the regex checks in lines 193-199 of the `claudevoice` file.