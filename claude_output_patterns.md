# Claude Code Output Patterns Analysis

Based on analysis of the ~/.claude/__store.db SQLite database containing 781 assistant messages, here are the key patterns found in Claude Code's output:

## 1. Tool Usage Patterns

Most frequently used tools (from 181 tool calls analyzed):
- **Bash**: 66 calls (36.5%) - Command execution
- **Read**: 35 calls (19.3%) - File reading
- **Write**: 25 calls (13.8%) - File creation
- **TodoWrite**: 19 calls (10.5%) - Task management
- **Edit**: 15 calls (8.3%) - File editing
- **Task**: 8 calls (4.4%) - Task execution
- **WebFetch**: 8 calls (4.4%) - Web content fetching
- **Glob**: 4 calls (2.2%) - File pattern matching
- **LS**: 1 call (0.6%) - Directory listing

## 2. Common Text Pattern Starters

Claude frequently begins responses with:
- "Let's" - 26 occurrences (14.4%)
- "Let me" - 18 occurrences (9.9%)
- "I'll" - 14 occurrences (7.7%)
- "Here's what" - 5 occurrences
- References to "completed" tasks - 3 occurrences

## 3. Conversation Structure Patterns

### Typical Response Flow:
1. **Acknowledgment**: "I'll help you [task description]"
2. **Action announcement**: "Let me [specific action]"
3. **Tool execution**: Uses appropriate tool
4. **Result explanation**: Explains what happened
5. **Next steps**: "Now let's..." or "Now we can..."

### Example Response Pattern:
```
"I'll help you set up the TTS command. Let me first check the current configuration."
[Tool: Read file]
"I see the issue. Let's update the Python path to use the correct version."
[Tool: Edit file]
"Perfect! Now the command should work. You can test it by running..."
```

## 4. Output Formatting Patterns

### Code Blocks:
- Always wrapped in triple backticks with language identifier
- Common languages: bash, python, javascript, json, markdown
- Often preceded by explanatory text

### Lists and Bullets:
- Standard markdown bullets (-, *, •) for regular lists
- Numbered lists (1., 2., 3.) for sequential steps
- **No ⏺ bullet points found** in the analyzed sample (likely used in stdout display only)

## 5. Task Management Patterns

When using TodoWrite:
1. Creates structured task lists with ID, content, status, and priority
2. Updates task status progressively (pending → in_progress → completed)
3. Often includes context about why tasks are being created/updated

Example pattern:
```
"Let's update our todo list to track the progress on these tasks:"
[TodoWrite tool call with structured task data]
"I've updated the tasks to reflect our current progress..."
```

## 6. Error Handling Patterns

Common error response patterns:
- "Let me check..." followed by diagnostic commands
- "I see the issue..." followed by explanation and fix
- "Let's try a different approach..." when first attempt fails

## 7. Approval Prompts and Interactive Elements

**Important Finding**: No approval prompt patterns were found in the stored messages. This suggests:
- Approval prompts are handled at the CLI level, not stored in conversation history
- The garbage text issues (99, 2k1a, 1004l) likely come from terminal interaction, not Claude's responses

## 8. Terminal Output Considerations

Based on the tool usage patterns, terminal output likely includes:
- Command execution results from Bash tool
- File contents from Read tool
- Success/error messages from Write/Edit tools
- Progress indicators during long operations

## 9. Missing Patterns

Notable absences in the analyzed data:
- No ⏺ bullet points (these appear to be terminal-specific)
- No approval prompt text (handled by CLI interface)
- No plan mode examples (might be a newer feature)
- No compact mode usage
- No terminal escape sequences in stored messages

## Recommendations for ClaudeVoice Filtering

Based on this analysis, ClaudeVoice should:

1. **Focus on filtering terminal-level output**, not stored message content
2. **Handle approval prompts at the CLI stdout level**
3. **Watch for ⏺ bullets in stdout** (not in message content)
4. **Filter common terminal artifacts**:
   - Escape sequences (\\x1b[...)
   - Approval prompt responses (99, 2k1a, 1004l)
   - Progress indicators
   - Tool execution headers/footers

5. **Preserve explanatory text** that typically:
   - Starts with "I'll", "Let's", "Let me"
   - Contains "Here's what", "Now", "Perfect"
   - Explains actions before/after tool use

## Conclusion

The analysis reveals that Claude Code's stored messages are clean and well-structured. The garbage text and formatting issues ClaudeVoice needs to handle appear to come from:
1. Terminal interaction layer (approval prompts)
2. CLI stdout formatting (⏺ bullets)
3. Tool execution output display

This suggests ClaudeVoice's current approach of filtering stdout is correct, and the focus should be on enhancing terminal output pattern detection rather than message content filtering.