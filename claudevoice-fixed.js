#!/usr/bin/env node

/**
 * ClaudeVoice FIXED - Based on real debug data analysis
 */

const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Load Edge-TTS
let EdgeTTS;
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

// Config
const CONFIG_PATH = path.join(os.homedir(), '.claudevoice-config.json');
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

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        }
    } catch {}
    return { voice: 'en-US-BrianNeural' };
}

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
let currentAudioProcess = null;

// CRITICAL: Track spoken content to prevent duplicates
let recentlySpoken = new Map(); // content -> timestamp
const DUPLICATE_WINDOW = 5000; // 5 seconds

// Play audio
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

// Queue text for speaking with duplicate prevention
function speak(text) {
    const clean = text.trim();
    if (clean.length < 10) return;
    
    // Clean old entries from recently spoken
    const now = Date.now();
    for (const [content, timestamp] of recentlySpoken.entries()) {
        if (now - timestamp > DUPLICATE_WINDOW) {
            recentlySpoken.delete(content);
        }
    }
    
    // Check if we've recently spoken this
    if (recentlySpoken.has(clean)) {
        return; // Skip duplicate
    }
    
    // Check for substring matches in recent content
    for (const [spoken] of recentlySpoken.entries()) {
        if (spoken.includes(clean) || clean.includes(spoken)) {
            return; // Skip partial duplicate
        }
    }
    
    // Mark as spoken and queue
    recentlySpoken.set(clean, now);
    audioQueue.push(clean);
    playAudio();
}

// Stop all TTS
function stopAllTTS() {
    audioQueue = [];
    if (currentAudioProcess) {
        try {
            currentAudioProcess.kill('SIGKILL');
        } catch {}
        currentAudioProcess = null;
    }
    isPlaying = false;
    recentlySpoken.clear();
}

// Enhanced filtering based on debug data
const SKIP_PATTERNS = [
    // Tool messages that leaked through
    /^Update Todos$/i,
    /^Updating todo/i,
    /^Updated the todo/i,
    /^TodoWrite\(/,
    /^Using the \w+ tool/i,
    /^I'll use the/i,
    /^Let me (use|run|execute|check)/i,
    /^Running command:/i,
    /^Executing:/i,
    
    // Status messages
    /^User approved/i,
    /^User declined/i,
    /^Permission granted/i,
    
    // File operations
    /^(Creating|Created|Writing|Reading|Editing|Deleting) (file|directory)/i,
    /^File (created|updated|deleted)/i,
    
    // Progress indicators
    /^\d+\s*%/,
    /^\[\d+\/\d+\]/,
    /^Step \d+/i,
    
    // Very short or numeric only
    /^[\d\s]+$/,
    /^\W+$/,
];

// State tracking
let messageBuffer = [];
let collectingMessage = false;
let lastBulletTime = 0;
let inApprovalContext = false;
let approvalTimeout = null;

// Process each line
function processLine(line) {
    // Interrupt commands
    if (line.includes('//stfu') || line.includes('cvstfu!')) {
        stopAllTTS();
        return;
    }
    
    // Detect special modes
    if (line.includes('/compact') || line.includes('/plan')) {
        recentlySpoken.clear(); // Clear history to avoid re-speaking
        return;
    }
    
    // Clean the line - aggressive stripping
    const cleaned = line
        .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')      // ANSI CSI
        .replace(/\x1b\]?[^\x1b\x07]*[\x1b\x07]/g, '') // OSC/other
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Control chars
        .replace(/\[[\d;]*[A-Z]/g, '')              // Bracket sequences
        .replace(/\[\d+[A-Z]/g, '')                 // More bracket sequences
        .trim();
    
    if (!cleaned || cleaned.length < 3) return;
    
    // Detect approval context
    if (cleaned.match(/Do you want to|permission|approval|proceed\?/i)) {
        inApprovalContext = true;
        clearTimeout(approvalTimeout);
        approvalTimeout = setTimeout(() => {
            inApprovalContext = false;
        }, 10000);
        return;
    }
    
    // Skip if in approval context and line looks like garbage
    if (inApprovalContext) {
        // Skip numbered options
        if (cleaned.match(/^[1-3]\.\s*(Yes|No)/i)) return;
        // Skip control sequence remnants
        if (cleaned.match(/^[A-Z\[\]]+$/)) return;
        // Skip very short lines during approval
        if (cleaned.length < 10) return;
    }
    
    // Check for bullet
    if (cleaned.startsWith('⏺')) {
        const content = cleaned.substring(1).trim();
        
        // Apply skip patterns
        if (SKIP_PATTERNS.some(pattern => pattern.test(content))) {
            return;
        }
        
        // Prevent rapid duplicate bullets (within 1 second)
        const now = Date.now();
        if (now - lastBulletTime < 1000 && messageBuffer.length > 0) {
            return; // Skip likely duplicate
        }
        lastBulletTime = now;
        
        if (content.length > 10) {
            messageBuffer = [content];
            collectingMessage = true;
        }
        return;
    }
    
    // Continue collecting
    if (collectingMessage) {
        // Stop conditions
        if (!cleaned || 
            cleaned.startsWith('⏺') ||
            cleaned.startsWith('✻') ||
            cleaned.startsWith('✽') ||
            cleaned.startsWith('·') ||
            cleaned.startsWith('─') ||
            cleaned.startsWith('│') ||
            cleaned.startsWith('╭') ||
            cleaned.startsWith('╰') ||
            cleaned.match(/^[┌└├┤┬┴┼─│╭╮╯╰]+$/) || // Box drawing
            cleaned.includes('Do you want to proceed') ||
            SKIP_PATTERNS.some(p => p.test(cleaned))) {
            
            // Speak collected message
            if (messageBuffer.length > 0) {
                const fullMessage = messageBuffer.join(' ').trim();
                if (fullMessage.length > 15 && !SKIP_PATTERNS.some(p => p.test(fullMessage))) {
                    speak(fullMessage);
                }
            }
            messageBuffer = [];
            collectingMessage = false;
            
            // Process new bullet if found
            if (cleaned.startsWith('⏺')) {
                processLine(line);
            }
        } else {
            // Add to buffer
            messageBuffer.push(cleaned);
        }
    }
}

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
    console.log('\nTo change voice: claudevoice --voice <number>');
}

// Main
let args = process.argv.slice(2);

// Handle special commands
if (args[0] === '--help') {
    console.log('ClaudeVoice FIXED - Based on real terminal analysis');
    console.log('Usage: claudevoice [options] [claude arguments]');
    console.log('\nOptions:');
    console.log('  --voice <number>  Change voice (1-15)');
    console.log('  --list-voices     List available voices');
    console.log('  --help            Show this help');
    console.log('\nCommands during session:');
    console.log('  //stfu or cvstfu!  Stop TTS immediately');
    console.log('\nImprovements:');
    console.log('  - Prevents duplicate messages');
    console.log('  - Filters tool messages properly');
    console.log('  - Handles approval prompts cleanly');
    console.log('  - Based on real debug data');
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
        
        currentVoice = newVoice.id;
        tts = new EdgeTTS({ voice: currentVoice });
        speak(`Hello! I'm ${newVoice.name}, your new Claude Code voice.`);
        
        setTimeout(() => process.exit(0), 3000);
    } else {
        console.error('Invalid voice number. Use --list-voices to see options.');
        process.exit(1);
    }
    return;
}

// Filter args
if (args[0] === '--voice') {
    args = args.slice(2);
}

// Join args if needed
if (args.length > 0 && !args[0].startsWith('-')) {
    args = [args.join(' ')];
}

// Spawn claude with script for TTY
const claudeBin = findClaude();
const command = '/usr/bin/script';
const commandArgs = ['-q', '/dev/null', claudeBin, ...args];

const claude = spawn(command, commandArgs, {
    stdio: ['inherit', 'pipe', 'inherit'],
    env: { ...process.env, TERM: 'xterm-256color' },
    shell: false
});

// Process output
let buffer = '';
claude.stdout.on('data', (chunk) => {
    process.stdout.write(chunk);
    
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
        processLine(line);
    }
});

// Handle exit
claude.on('exit', (code) => {
    if (buffer) processLine(buffer);
    
    if (collectingMessage && messageBuffer.length > 0) {
        const fullMessage = messageBuffer.join(' ').trim();
        if (fullMessage.length > 15 && !SKIP_PATTERNS.some(p => p.test(fullMessage))) {
            speak(fullMessage);
        }
    }
    
    setTimeout(() => process.exit(code || 0), 200);
});

// Handle interrupt
process.on('SIGINT', () => {
    stopAllTTS();
    claude.kill('SIGINT');
});