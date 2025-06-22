#!/usr/bin/env node

/**
 * ClaudeVoice - Improved version based on comprehensive pattern analysis
 */

const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Load Edge-TTS
let EdgeTTS;

// Get npm global root dynamically
let npmGlobalRoot;
try {
    npmGlobalRoot = require('child_process')
        .execSync('npm root -g', { encoding: 'utf8' })
        .trim();
} catch {}

const ttsLocations = [
    './node_modules/node-edge-tts',
    npmGlobalRoot && path.join(npmGlobalRoot, 'node-edge-tts'),
    path.join(os.homedir(), '.npm-global/lib/node_modules/node-edge-tts'),
    '/usr/local/lib/node_modules/node-edge-tts',
    '/opt/homebrew/lib/node_modules/node-edge-tts',
    'node-edge-tts'
].filter(Boolean);

for (const loc of ttsLocations) {
    try {
        EdgeTTS = require(loc).EdgeTTS;
        break;
    } catch {}
}

if (!EdgeTTS) {
    console.error('Error: node-edge-tts not found. Install with:');
    console.error('  npm install -g node-edge-tts');
    process.exit(1);
}

// Config file for persistence
const CONFIG_PATH = path.join(os.homedir(), '.claudevoice-config.json');

// Available Edge-TTS voices
const VOICES = [
    { id: 'en-US-ChristopherNeural', name: 'Christopher', desc: 'Deep, warm male voice' },
    { id: 'en-US-EricNeural', name: 'Eric', desc: 'Professional male voice' },
    { id: 'en-US-GuyNeural', name: 'Guy', desc: 'Friendly male voice' },
    { id: 'en-US-RogerNeural', name: 'Roger', desc: 'Mature, authoritative male' },
    { id: 'en-US-TonyNeural', name: 'Tony', desc: 'Energetic male voice' },
    { id: 'en-US-DavisNeural', name: 'Davis', desc: 'Young professional male' },
    { id: 'en-US-JasonNeural', name: 'Jason', desc: 'Casual male voice' },
    { id: 'en-US-AndrewNeural', name: 'Andrew', desc: 'Natural male voice' },
    { id: 'en-US-BrianNeural', name: 'Brian', desc: 'Clear male voice' },
    { id: 'en-GB-RyanNeural', name: 'Ryan (UK)', desc: 'British male voice' },
    { id: 'en-GB-ThomasNeural', name: 'Thomas (UK)', desc: 'Refined British male' },
    { id: 'en-AU-WilliamNeural', name: 'William (AU)', desc: 'Australian male voice' },
    { id: 'en-US-AriaNeural', name: 'Aria', desc: 'Pleasant female voice' },
    { id: 'en-US-JennyNeural', name: 'Jenny', desc: 'Friendly female voice' },
    { id: 'en-US-MichelleNeural', name: 'Michelle', desc: 'Professional female' }
];

// Load saved config
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        }
    } catch {}
    return { voice: 'en-US-BrianNeural' };
}

// Save config
function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch {}
}

// TTS setup
const config = loadConfig();
let currentVoice = config.voice;
let tts = new EdgeTTS({ voice: currentVoice });
let audioQueue = [];
let isPlaying = false;
let spokenMessages = new Set(); // Track what we've already spoken

// Track current audio process for killing
let currentAudioProcess = null;

// Play audio queue
async function playAudio() {
    if (isPlaying || audioQueue.length === 0) return;
    
    isPlaying = true;
    const text = audioQueue.shift();
    
    try {
        const tempFile = path.join(os.tmpdir(), `claude-${Date.now()}.mp3`);
        await tts.ttsPromise(text, tempFile);
        
        const player = process.platform === 'darwin' ? 'afplay' :
                       process.platform === 'win32' ? 'powershell' : 'aplay';
        const args = process.platform === 'win32' ? 
            ['-c', `(New-Object Media.SoundPlayer '${tempFile}').PlaySync()`] : [tempFile];
        
        currentAudioProcess = spawn(player, args, { stdio: 'ignore' });
        currentAudioProcess.on('exit', () => {
            try { fs.unlinkSync(tempFile); } catch {}
            currentAudioProcess = null;
            isPlaying = false;
            playAudio();
        });
    } catch {
        currentAudioProcess = null;
        isPlaying = false;
        playAudio();
    }
}

// Queue text for speaking
function speak(text) {
    const clean = text.trim();
    
    // Don't speak duplicates or partial duplicates
    if (spokenMessages.has(clean)) {
        return;
    }
    
    // Check if this is a substring of something we already spoke
    for (const spoken of spokenMessages) {
        if (spoken.includes(clean) || clean.includes(spoken)) {
            return;
        }
    }
    
    if (clean.length > 10) {
        spokenMessages.add(clean); // Remember what we've spoken
        audioQueue.push(clean);
        playAudio();
        
        // Clean up old messages after a while to prevent memory growth
        if (spokenMessages.size > 100) {
            const messages = Array.from(spokenMessages);
            messages.slice(0, 50).forEach(msg => spokenMessages.delete(msg));
        }
    }
}

// Stop all TTS immediately
function stopAllTTS() {
    // Clear the queue
    audioQueue = [];
    
    // Kill current audio if playing
    if (currentAudioProcess) {
        try {
            currentAudioProcess.kill('SIGKILL');
        } catch {}
        currentAudioProcess = null;
    }
    
    // Reset playing state
    isPlaying = false;
    
    // Clear spoken messages to allow re-speaking if needed
    spokenMessages.clear();
    
    // Reset message collection
    messageBuffer = [];
    collectingMessage = false;
}

// Pattern detection states
let messageBuffer = [];
let collectingMessage = false;
let recentlySeenPlanMode = false;
let recentlySeenCompact = false;
let inApprovalContext = false;
let approvalTimeout = null;

// Comprehensive garbage patterns based on analysis
const GARBAGE_PATTERNS = [
    // Terminal control sequence remnants
    /^\??\d{3,4}[lh]\d*$/i,          // ?1004l, 1004l99
    /^[lh]\d*$/i,                     // l99, h1
    /^\d+[lh]$/i,                     // 99l, 1004l
    
    // Known specific garbage
    /^(1a2k|2k1a|1004l|99|2k|1a)$/i,
    /^(two\s*k\s*one\s*a|2\s*k\s*1\s*a)$/i,
    /^g$/i,
    
    // Repeated patterns
    /^((2k1a|two\s*k\s*one\s*a|1a2k)\s*)+g?$/i,
    
    // Short alphanumeric garbage
    /^[a-z]{1,2}\d{1,3}$/i,           // a99, ab123
    /^\d{1,3}[a-z]{1,2}$/i,           // 99a, 123ab
    /^[a-z]\d[a-z]\d?$/i,             // a1b2
    
    // Single characters or very short
    /^[a-z]$/i,
    /^[A-Z]$/,
    /^\d{1,2}$/,
    /^[^\w\s]{1,3}$/,                 // Special chars only
];

// Tool output patterns to filter
const TOOL_OUTPUT_PATTERNS = [
    /^Running command:/i,
    /^Reading file:/i,
    /^Invoking mcp_/i,
    /^✓ Successfully/i,
    /^✗ Error:/i,
    /^\[\d+\/\d+\]/,                  // Progress indicators [1/5]
    /^Searching for/i,
    /^Found \d+ (files?|matches?)/i,
    /^Writing to file:/i,
    /^Creating file:/i,
    /^Updating file:/i,
];

// Approval-related patterns
const APPROVAL_PATTERNS = [
    /\b(allow|decline|permission|approval|authorize|grant|proceed)\b/i,
    /do you want to/i,
    /would you like/i,
    /shall I/i,
    /should I/i,
    /may I/i,
    /can I/i,
    /\?.*\(yes\/no\)/i,
    /^[1-3]\.\s*(Allow|Always allow|Decline)/i,
];

// Clean terminal control sequences
function cleanTerminalCodes(line) {
    return line
        .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')     // ANSI CSI sequences
        .replace(/\x1b\][^\x07]*\x07/g, '')         // OSC sequences
        .replace(/\x1b[PX\^_][^\\]*\\/g, '')        // DCS/SOS/PM/APC sequences
        .replace(/\x1b[()][A-Z0-9]/g, '')           // Character set sequences
        .replace(/\x1b[<=>]/g, '')                  // Other escape codes
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '') // Control chars (except tab/newline/CR)
        .replace(/\x7F/g, '')                        // DEL character
        .replace(/\x9B[0-9;]*[a-zA-Z]/g, '');       // 8-bit CSI
}

// Check if line contains approval-related content
function isApprovalRelated(line) {
    return APPROVAL_PATTERNS.some(pattern => pattern.test(line));
}

// Check if line is garbage
function isGarbage(line) {
    return GARBAGE_PATTERNS.some(pattern => pattern.test(line));
}

// Check if line is tool output
function isToolOutput(line) {
    return TOOL_OUTPUT_PATTERNS.some(pattern => pattern.test(line));
}

// Process each line of output
function processLine(line) {
    // Check for interrupt commands
    if (line.includes('//stfu') || line.includes('cvstfu!')) {
        stopAllTTS();
        return;
    }
    
    // Clean the line
    const cleanedLine = cleanTerminalCodes(line).trim();
    
    // Skip empty or very short lines
    if (!cleanedLine || cleanedLine.length < 2) {
        return;
    }
    
    // Detect plan mode entry (multiple patterns)
    if (cleanedLine.includes('entering plan mode') || 
        cleanedLine.includes('exit_plan_mode') ||
        cleanedLine.includes("Here's my plan:") ||
        cleanedLine.includes("Let me plan")) {
        recentlySeenPlanMode = true;
        spokenMessages.clear();
        setTimeout(() => { recentlySeenPlanMode = false; }, 10000);
        return;
    }
    
    // Detect compact mode
    if (line.includes('/compact') || cleanedLine.includes('Conversation compacted')) {
        recentlySeenCompact = true;
        spokenMessages.clear();
        setTimeout(() => { recentlySeenCompact = false; }, 5000);
        return;
    }
    
    // Skip history lines in compact mode
    if (recentlySeenCompact && (
        cleanedLine.startsWith('Human:') || 
        cleanedLine.startsWith('Assistant:') ||
        cleanedLine.match(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/)
    )) {
        return;
    }
    
    // Handle approval context
    if (isApprovalRelated(cleanedLine)) {
        inApprovalContext = true;
        clearTimeout(approvalTimeout);
        approvalTimeout = setTimeout(() => {
            inApprovalContext = false;
        }, 8000);
        return;
    }
    
    // Skip garbage in approval context
    if (inApprovalContext && isGarbage(cleanedLine)) {
        return;
    }
    
    // Skip tool output patterns
    if (isToolOutput(cleanedLine)) {
        return;
    }
    
    // Check for ⏺ bullet (main explanatory text marker)
    if (cleanedLine.startsWith('⏺')) {
        const content = cleanedLine.substring(1).trim();
        
        // Filter out common tool messages
        if (content && 
            content.length > 10 &&
            !content.match(/^\w+\s*\(/) &&  // Function calls
            !content.match(/^(Using|Updating|Updated|Creating|Created|Running|Executing|Processing|Analyzing|Searching|Loading|Saving|Building|Installing|Deleting|Removing|Adding|Modifying)\s/i)
        ) {
            messageBuffer = [content];
            collectingMessage = true;
        }
        return;
    }
    
    // Check for thinking mode (✻ Thinking)
    if (cleanedLine.startsWith('✻ Thinking')) {
        // Could add thinking mode support here if needed
        return;
    }
    
    // If we're collecting a message
    if (collectingMessage) {
        // Stop conditions
        if (!cleanedLine || 
            cleanedLine.startsWith('⏺') ||
            cleanedLine.startsWith('✻') ||
            cleanedLine.startsWith('✽') ||
            cleanedLine.startsWith('·') ||
            cleanedLine.startsWith('✓') ||
            cleanedLine.startsWith('✗') ||
            cleanedLine.match(/^\[\s*[✓→]\s*\]/) || // Todo indicators
            cleanedLine.match(/^#{1,6}\s/) ||        // Markdown headers
            cleanedLine.match(/^\d+\.\s/) ||          // Numbered lists in output
            isToolOutput(cleanedLine) ||
            isGarbage(cleanedLine)
        ) {
            // Speak collected message
            if (messageBuffer.length > 0) {
                const fullMessage = messageBuffer.join(' ').trim();
                speak(fullMessage);
            }
            messageBuffer = [];
            collectingMessage = false;
            
            // If this was a new bullet, process it
            if (cleanedLine.startsWith('⏺')) {
                processLine(line);
            }
        } else {
            // Continue collecting
            messageBuffer.push(cleanedLine);
        }
    }
}

// Find claude binary
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

// Show voice menu
function showVoiceMenu() {
    console.log('\n🎙️  ClaudeVoice Settings\n');
    console.log('Available voices:\n');
    
    VOICES.forEach((voice, index) => {
        const isCurrent = voice.id === currentVoice;
        const marker = isCurrent ? '►' : ' ';
        const num = String(index + 1).padStart(2, ' ');
        const name = voice.name.padEnd(15);
        console.log(`${marker} ${num}. ${name} ${voice.desc}`);
    });
    
    console.log(`\nCurrent voice: ${VOICES.find(v => v.id === currentVoice)?.name || 'Unknown'}`);
    console.log('\nTo change voice, run: claudevoice --voice <number>');
}

// Main
let args = process.argv.slice(2);

// Handle special commands
if (args[0] === '--help') {
    console.log('ClaudeVoice - TTS for Claude Code');
    console.log('Usage: claudevoice [options] [claude arguments]');
    console.log('\nOptions:');
    console.log('  --voice <number>  Change voice (1-15)');
    console.log('  --list-voices     List available voices');
    console.log('  --help            Show this help');
    console.log('\nCommands during session:');
    console.log('  //stfu or cvstfu!  Stop TTS immediately');
    console.log('\nBased on comprehensive pattern analysis of Claude Code output');
    process.exit(0);
} else if (args[0] === '--list-voices') {
    showVoiceMenu();
    process.exit(0);
} else if (args[0] === '--voice' && args[1]) {
    const num = parseInt(args[1]);
    if (num >= 1 && num <= VOICES.length) {
        const newVoice = VOICES[num - 1];
        config.voice = newVoice.id;
        saveConfig(config);
        console.log(`✓ Voice changed to ${newVoice.name}`);
        
        // Test the new voice
        currentVoice = newVoice.id;
        tts = new EdgeTTS({ voice: currentVoice });
        audioQueue.push(`Hello! I'm ${newVoice.name}, your new Claude Code voice.`);
        playAudio();
        
        setTimeout(() => process.exit(0), 3000);
    } else {
        console.error('Invalid voice number. Use --list-voices to see options.');
        process.exit(1);
    }
    return;
}

// Filter out our own arguments
let claudeArgs = args;
if (args[0] === '--voice') {
    claudeArgs = args.slice(2);
}

// Join args if needed
if (claudeArgs.length > 0 && !claudeArgs[0].startsWith('-')) {
    claudeArgs = [claudeArgs.join(' ')];
}

// Spawn claude with script for TTY
const claudeBin = findClaude();
const command = '/usr/bin/script';
const commandArgs = ['-q', '/dev/null', claudeBin, ...claudeArgs];

const claude = spawn(command, commandArgs, {
    stdio: ['inherit', 'pipe', 'inherit'],
    env: { ...process.env, TERM: 'xterm-256color' },
    shell: false
});

// Process output line by line
let buffer = '';
claude.stdout.on('data', (chunk) => {
    // Pass through to terminal
    process.stdout.write(chunk);
    
    // Buffer for line processing
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    // Process each complete line
    for (const line of lines) {
        processLine(line);
    }
});

// Handle exit
claude.on('exit', (code) => {
    // Process any remaining buffer
    if (buffer) {
        processLine(buffer);
    }
    
    // Final message if still collecting
    if (collectingMessage && messageBuffer.length > 0) {
        const fullMessage = messageBuffer.join(' ').trim();
        speak(fullMessage);
    }
    
    setTimeout(() => process.exit(code || 0), 200);
});

// Handle interrupt
process.on('SIGINT', () => {
    stopAllTTS();
    claude.kill('SIGINT');
});