#!/bin/bash

# ClaudeVoice Demo Script
# Shows off the features of ClaudeVoice

echo "🎙️  ClaudeVoice Demo"
echo "==================="
echo ""
echo "This demo will show you what ClaudeVoice can do!"
echo ""

# Check if claudevoice is installed
if ! command -v claudevoice &> /dev/null; then
    echo "❌ ClaudeVoice not found! Please run ./install.sh first"
    exit 1
fi

echo "1️⃣  Listing available voices..."
echo "--------------------------------"
claudevoice --list-voices
echo ""
echo "Press Enter to continue..."
read

echo "2️⃣  Testing voice change..."
echo "-------------------------"
echo "Changing to British accent (Ryan)..."
claudevoice --voice 10
echo ""
echo "Press Enter to continue..."
read

echo "3️⃣  Testing Claude integration..."
echo "-------------------------------"
echo "Let's ask Claude a simple question..."
echo "Running: claudevoice \"What is 2+2?\""
echo ""
echo "Claude should speak the answer!"
echo ""
echo "Press Enter to test..."
read

claudevoice "What is 2+2?"

echo ""
echo "🎉 Demo complete!"
echo ""
echo "Try these commands:"
echo "  claudevoice --voice 13      # Try Aria (female voice)"
echo "  claudevoice --voice 1       # Back to Christopher"
echo "  claudevoice \"explain git\"   # Any Claude command works!"
echo ""
echo "Enjoy ClaudeVoice! 🚀"