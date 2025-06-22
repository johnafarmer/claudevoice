#!/usr/bin/env node

/**
 * ClaudeVoice DB Simple - Reads from Claude's database using sqlite3 CLI
 * No npm dependencies needed beyond edge-tts!
 */

const { spawn, exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Edge-TTS setup
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

// Config paths
const CONFIG_PATH = path.join(os.homedir(), '.claudevoice-config.json');
const CLAUDE_DB_PATH = path.join(os.homedir(), '.claude/__store.db');

// Voice configuration
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
let lastMessageTimestamp = Math.floor(Date.now() / 1000);
let spokenMessages = new Set();

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
    
    // Don't speak duplicates
    if (spokenMessages.has(clean)) return;
    
    if (clean.length > 15) {
        spokenMessages.add(clean);
        audioQueue.push(clean);
        playAudio();
        
        // Cleanup old messages
        if (spokenMessages.size > 100) {
            const messages = Array.from(spokenMessages);
            messages.slice(0, 50).forEach(msg => spokenMessages.delete(msg));
        }
    }
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
}

// Process clean message content
function processMessageContent(content) {
    // Skip tool-related introductions
    const toolPatterns = [
        /^(I'll|Let me|Let's|I'm going to|I need to|I should|I can|I will)\s+(now\s+)?(use|run|execute|check|search|look|find|update|create|modify|analyze)/i,
        /^(Using|Running|Executing|Checking|Searching|Looking|Finding|Updating|Creating|Modifying|Analyzing)/i,
        /^(Here's|Here are|This is|These are)\s+(the|some|my)\s+(results?|output|findings?)/i
    ];
    
    if (toolPatterns.some(p => p.test(content))) {
        return;
    }
    
    // Split into sentences for natural TTS flow
    const sentences = content
        .split(/(?<=[.!?])\s+/)
        .filter(s => s.trim().length > 15);
    
    sentences.forEach(sentence => {
        // Additional filtering
        if (!sentence.match(/```|^\s*[-*]\s|^\d+\.\s|^#+\s/)) { // Skip code blocks, lists, headers
            speak(sentence.trim());
        }
    });
}

// Query database for new messages
function queryNewMessages(callback) {
    const query = `SELECT message, timestamp FROM assistant_messages WHERE timestamp > ${lastMessageTimestamp} ORDER BY timestamp ASC`;
    
    exec(`sqlite3 "${CLAUDE_DB_PATH}" "${query}"`, (error, stdout, stderr) => {
        if (error) {
            console.error('Database query error:', error);
            return;
        }
        
        const lines = stdout.trim().split('\n').filter(l => l);
        lines.forEach(line => {
            const parts = line.split('|');
            if (parts.length >= 2) {
                const messageJson = parts.slice(0, -1).join('|'); // Handle | in message
                const timestamp = parseInt(parts[parts.length - 1]);
                
                try {
                    const msg = JSON.parse(messageJson);
                    if (msg.content && Array.isArray(msg.content)) {
                        msg.content.forEach(item => {
                            if (item.type === 'text' && item.text) {
                                processMessageContent(item.text);
                            }
                        });
                    }
                    lastMessageTimestamp = timestamp;
                } catch (e) {
                    // Skip malformed messages
                }
            }
        });
        
        callback();
    });
}

// Monitor mode - watch database for new messages
function startMonitorMode() {
    console.log('🎤 ClaudeVoice DB Monitor - Reading clean messages from database');
    console.log('This mode watches for new Claude messages without terminal parsing!');
    console.log('Commands: //stfu or Ctrl+C to stop\n');
    
    // Check if database exists
    if (!fs.existsSync(CLAUDE_DB_PATH)) {
        console.error('Claude database not found at:', CLAUDE_DB_PATH);
        console.error('Make sure Claude Code is installed and has been used.');
        process.exit(1);
    }
    
    // Start monitoring
    const checkInterval = setInterval(() => {
        queryNewMessages(() => {
            // Callback after processing
        });
    }, 1000); // Check every second
    
    // Handle stdin for commands
    process.stdin.setRawMode(true);
    process.stdin.on('data', (data) => {
        const input = data.toString();
        if (input.includes('\x03')) { // Ctrl+C
            clearInterval(checkInterval);
            stopAllTTS();
            process.exit(0);
        }
    });
    
    // Initial message
    speak("Claude Voice database monitor is now active. I'll speak new messages as they appear.");
}

// Hybrid mode - run Claude and monitor database simultaneously
function startHybridMode(claudeArgs) {
    console.log('🎤 ClaudeVoice Hybrid Mode - Clean TTS from database');
    console.log('Running Claude while monitoring database for clean messages...\n');
    
    // Find and spawn Claude
    const claudeBin = findClaude();
    const claude = spawn(claudeBin, claudeArgs, {
        stdio: 'inherit',
        env: process.env
    });
    
    // Start database monitoring
    const checkInterval = setInterval(() => {
        queryNewMessages(() => {});
    }, 500); // Check every 500ms for responsiveness
    
    // Cleanup on Claude exit
    claude.on('exit', (code) => {
        clearInterval(checkInterval);
        // Give time for final messages
        setTimeout(() => {
            stopAllTTS();
            process.exit(code || 0);
        }, 2000);
    });
    
    // Handle interrupt
    process.on('SIGINT', () => {
        clearInterval(checkInterval);
        stopAllTTS();
        claude.kill('SIGINT');
    });
}

// Find Claude binary
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
    console.log('\nTo change voice, run: claudevoice-db --voice <number>');
}

// Main
let args = process.argv.slice(2);

// Handle special commands
if (args.includes('--help') || args.length === 0) {
    console.log('ClaudeVoice DB - Clean TTS from Claude\'s database');
    console.log('\nUsage:');
    console.log('  cvdb monitor            Monitor database for new messages');
    console.log('  cvdb [claude args]      Run Claude with database TTS');
    console.log('\nOptions:');
    console.log('  --voice <number>  Change voice (1-15)');
    console.log('  --list-voices     List available voices');
    console.log('  --help            Show this help');
    console.log('\nThis reads clean messages from Claude\'s database,');
    console.log('completely avoiding terminal parsing issues!');
    process.exit(0);
}

if (args[0] === '--list-voices') {
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

// Remove --voice args if present
if (args[0] === '--voice') {
    args = args.slice(2);
}

// Decide mode
if (args[0] === 'monitor') {
    startMonitorMode();
} else {
    // Join args if needed for Claude command
    if (args.length > 0 && !args[0].startsWith('-')) {
        args = [args.join(' ')];
    }
    startHybridMode(args);
}