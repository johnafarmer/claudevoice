#!/usr/bin/env node

/**
 * Debug tool to capture and analyze what happens during /compact
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Create debug log file
const debugFile = path.join(os.tmpdir(), `claudevoice-debug-${Date.now()}.log`);
const debugStream = fs.createWriteStream(debugFile);

console.log(`Debug log will be written to: ${debugFile}`);
console.log('Run Claude with any command, then use /compact to see what happens');
console.log('Press Ctrl+C when done\n');

// Find claude
function findClaude() {
    const paths = ['claude', '/usr/local/bin/claude', '/opt/homebrew/bin/claude'];
    for (const p of paths) {
        try {
            require('child_process').execSync(`which ${p}`, { stdio: 'ignore' });
            return p;
        } catch {}
    }
    console.error('Claude Code CLI not found');
    process.exit(1);
}

// Spawn claude
const claudeBin = findClaude();
const args = process.argv.slice(2);
const claude = spawn('/usr/bin/script', ['-q', '/dev/null', claudeBin, ...args], {
    stdio: ['inherit', 'pipe', 'inherit'],
    env: { ...process.env, TERM: 'xterm-256color' },
    shell: false
});

let lineNumber = 0;
let buffer = '';
let compactDetected = false;

// Process output
claude.stdout.on('data', (chunk) => {
    // Pass through to terminal
    process.stdout.write(chunk);
    
    // Log raw chunk
    debugStream.write(`\n=== CHUNK ${Date.now()} ===\n`);
    debugStream.write(`RAW: ${JSON.stringify(chunk.toString())}\n`);
    
    // Process lines
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
        lineNumber++;
        
        // Check for /compact command
        if (line.includes('/compact')) {
            compactDetected = true;
            debugStream.write(`\n!!! /COMPACT DETECTED at line ${lineNumber} !!!\n`);
        }
        
        // Log processed line
        const stripped = line.replace(/\x1b\[[^m]*m/g, '').replace(/\x1b\]?[^\x1b\x07]*[\x1b\x07]/g, '');
        debugStream.write(`LINE ${lineNumber}: ${JSON.stringify(line)}\n`);
        debugStream.write(`STRIPPED: ${JSON.stringify(stripped)}\n`);
        
        // Log if this would trigger TTS
        if (stripped.trim().startsWith('⏺')) {
            debugStream.write(`>>> WOULD SPEAK: ${stripped.substring(1).trim()}\n`);
        }
        
        if (compactDetected) {
            debugStream.write(`[AFTER COMPACT] `);
        }
        
        debugStream.write('\n');
    }
});

// Handle exit
claude.on('exit', (code) => {
    console.log(`\n\nDebug log saved to: ${debugFile}`);
    console.log('You can analyze it with: cat ' + debugFile);
    debugStream.end();
    process.exit(code || 0);
});

// Handle interrupt
process.on('SIGINT', () => {
    claude.kill('SIGINT');
});