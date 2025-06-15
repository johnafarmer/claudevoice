#!/bin/bash

# ClaudeVoice Quick Installer
# This script installs ClaudeVoice and its dependencies

echo "🎙️  ClaudeVoice Installer"
echo "========================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if Claude is installed
if ! command -v claude &> /dev/null; then
    echo "❌ Claude Code CLI is not installed!"
    echo "Please install Claude Code from https://claude.ai/code"
    exit 1
fi

echo "✅ Prerequisites found!"
echo ""

# Install node-edge-tts
echo "📦 Installing text-to-speech engine..."
if npm install -g node-edge-tts; then
    echo "✅ TTS engine installed!"
else
    echo "❌ Failed to install TTS engine"
    echo "Try running: sudo npm install -g node-edge-tts"
    exit 1
fi

echo ""

# Install audio player on Linux
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Detected Linux - checking audio player..."
    if ! command -v mpg123 &> /dev/null; then
        echo "Installing mpg123..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y mpg123
        elif command -v dnf &> /dev/null; then
            sudo dnf install -y mpg123
        elif command -v pacman &> /dev/null; then
            sudo pacman -S mpg123
        else
            echo "⚠️  Please install mpg123 manually for audio playback"
        fi
    else
        echo "✅ Audio player found!"
    fi
fi

echo ""

# Make claudevoice executable
echo "🔧 Setting up ClaudeVoice..."
chmod +x claudevoice

# Install to /usr/local/bin
echo "📍 Installing to /usr/local/bin..."
if sudo cp claudevoice /usr/local/bin/; then
    echo "✅ ClaudeVoice installed!"
    # Create cv alias symlink
    echo "🔗 Creating 'cv' alias..."
    if sudo ln -sf /usr/local/bin/claudevoice /usr/local/bin/cv; then
        echo "✅ 'cv' alias created!"
    else
        echo "⚠️  Failed to create 'cv' alias"
    fi
else
    echo "❌ Failed to install to /usr/local/bin"
    echo "You can manually copy claudevoice to a directory in your PATH"
    exit 1
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "Test it out:"
echo "  claudevoice --list-voices    # See available voices"
echo "  claudevoice --voice 10       # Try a British accent"
echo "  claudevoice \"hello world\"    # Start using Claude with voice!"
echo ""
echo "You can also use 'cv' as a shortcut:"
echo "  cv \"hello world\"            # Same as claudevoice"
echo ""
echo "Enjoy your new AI voice assistant! 🚀"