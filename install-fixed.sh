#!/bin/bash

echo "Installing ClaudeVoice Fixed Version..."
echo "======================================"
echo ""

# Check if node-edge-tts is installed
if ! npm list -g node-edge-tts >/dev/null 2>&1; then
    echo "Installing node-edge-tts..."
    npm install -g node-edge-tts
fi

# Make claudevoice executable
chmod +x claudevoice

# Create aliases
echo "Creating aliases..."
chmod +x cvt-fixed 2>/dev/null || true

# Copy to /usr/local/bin
echo ""
echo "To complete installation, run:"
echo "  sudo cp claudevoice /usr/local/bin/"
echo ""
echo "Or create an alias in your shell config:"
echo "  alias cv='$(pwd)/claudevoice'"
echo "  alias cvt='$(pwd)/claudevoice'"
echo ""
echo "Test with: ./claudevoice --help"
echo ""
echo "Key improvements in this version:"
echo "  ✓ No more garbage text (99, 2k1a, 1004l)"
echo "  ✓ No duplicate messages"
echo "  ✓ Tool messages properly filtered"
echo "  ✓ Approval prompts handled cleanly"