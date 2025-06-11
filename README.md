# 🎙️ ClaudeVoice - Give Claude Code a Voice!

ClaudeVoice adds text-to-speech (TTS) to Claude Code CLI, making your AI assistant speak its responses aloud. Perfect for hands-free coding, accessibility, or just making your coding sessions more interactive!

![ClaudeVoice Demo](https://img.shields.io/badge/AI-Speaks-brightgreen)
![Claude Code](https://img.shields.io/badge/Claude-Code-blue)
![TTS](https://img.shields.io/badge/TTS-Enabled-orange)

## 🚀 What is ClaudeVoice?

ClaudeVoice is a simple wrapper that:
- 🗣️ Speaks Claude's explanations and responses using high-quality neural voices
- 🎭 Offers 15 different voices to choose from (male, female, accents)
- 🧹 Filters out code and technical output - only speaks the important stuff
- 💡 Works seamlessly - just use `claudevoice` instead of `claude`

## 📋 Prerequisites

Before installing ClaudeVoice, you need:

1. **Claude Code CLI** - Install from [claude.ai/code](https://claude.ai/code)
2. **Node.js** - Download from [nodejs.org](https://nodejs.org/) (v14 or higher)
3. **Audio Player** - Built-in on macOS, install `mpg123` on Linux:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install mpg123
   
   # Fedora
   sudo dnf install mpg123
   ```

## 🎯 Quick Install (30 seconds!)

```bash
# 1. Install the TTS engine
npm install -g node-edge-tts

# 2. Download ClaudeVoice
curl -O https://raw.githubusercontent.com/johnafarmer/claudevoice/main/claudevoice
# OR if you cloned the repo:
# cp /path/to/claudevoice .

# 3. Make it executable
chmod +x claudevoice

# 4. Move to your PATH
sudo mv claudevoice /usr/local/bin/

# 5. Test it!
claudevoice --list-voices
```

## 🎮 Usage

### Basic Usage
Use ClaudeVoice exactly like Claude Code:

```bash
# Instead of: claude "explain this code"
claudevoice "explain this code"

# All Claude commands work
claudevoice "help me debug this error"
claudevoice "what does this function do"
claudevoice --help
```

### Choose Your Voice

```bash
# See all available voices
claudevoice --list-voices

# Change to a British accent
claudevoice --voice 10

# Change to a female voice
claudevoice --voice 13

# Your choice is saved automatically!
```

### Available Voices

| # | Voice | Description |
|---|-------|-------------|
| 1 | Christopher | Deep, warm male voice (default) |
| 2 | Eric | Professional male voice |
| 3 | Guy | Friendly male voice |
| 4 | Roger | Mature, authoritative male |
| 5 | Tony | Energetic male voice |
| 6 | Davis | Young professional male |
| 7 | Jason | Casual male voice |
| 8 | Andrew | Natural male voice |
| 9 | Brian | Clear male voice |
| 10 | Ryan (UK) | British male voice |
| 11 | Thomas (UK) | Refined British male |
| 12 | William (AU) | Australian male voice |
| 13 | Aria | Pleasant female voice |
| 14 | Jenny | Friendly female voice |
| 15 | Michelle | Professional female |

## 🛠️ Troubleshooting

### No Audio?

1. **Check TTS is installed:**
   ```bash
   npm list -g node-edge-tts
   ```

2. **On Linux, check audio player:**
   ```bash
   which mpg123
   # If not found: sudo apt-get install mpg123
   ```

3. **Test your audio:**
   ```bash
   # macOS
   say "test"
   
   # Linux
   echo "test" | espeak
   ```

### Permission Denied?

```bash
chmod +x claudevoice
```

### Command Not Found?

Make sure ClaudeVoice is in your PATH:
```bash
echo $PATH
# Move claudevoice to one of those directories, like:
sudo cp claudevoice /usr/local/bin/
```

## 🎯 Pro Tips

1. **Interrupt Speech**: Press `Ctrl+C` to stop audio and exit
2. **Volume Control**: Use your system volume controls
3. **Best Voices**: 
   - For clarity: Christopher, Eric, or Aria
   - For personality: Guy, Tony, or Jenny
   - For accents: Ryan (UK) or William (AU)

## 🐛 Known Quirks

- TTS responses are truncated at the first newline
- Very long responses are spoken in chunks as Claude generates them
- Code blocks and technical output are intentionally not spoken

## 📝 How It Works

ClaudeVoice works by:
1. Intercepting Claude Code's output
2. Looking for explanation markers (⏺ bullets)
3. Filtering out code and technical content
4. Speaking the human-readable text using Edge-TTS
5. Passing through all visual output unchanged

Your terminal experience remains exactly the same - ClaudeVoice just adds voice!

## 🤝 Contributing

Found a bug? Have an idea? PRs welcome!

## 📄 License

MIT License - Use it, modify it, share it!

## 🙏 Credits

- Built with [Edge-TTS](https://github.com/rany2/edge-tts) for high-quality neural voices
- Made for [Claude Code](https://claude.ai/code) by Anthropic
- Created with ❤️ for the developer community

---

**Remember**: ClaudeVoice just makes Claude speak - all the AI magic comes from Claude Code itself!

Happy coding with your new AI voice assistant! 🎉