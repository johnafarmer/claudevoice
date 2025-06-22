#!/usr/bin/env node

/**
 * ClaudeVoice DB - Reads from Claude's clean database instead of terminal output
 * This approach avoids all terminal parsing issues!
 */

const { spawn, exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Edge-TTS setup (same as before)
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

// Try to load sqlite3
let sqliteAvailable = false;
try {
    require('sqlite3');
    sqliteAvailable = true;
} catch {
    console.error('Warning: sqlite3 not found. Install with:');
    console.error('  npm install -g sqlite3');
    console.error('Falling back to terminal parsing mode...');
}

// Config and voice setup
const CONFIG_PATH = path.join(os.homedir(), '.claudevoice-config.json');
const CLAUDE_DB_PATH = path.join(os.homedir(), '.claude/__store.db');

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
let lastMessageTimestamp = Date.now();

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
    if (clean.length > 10) {
        audioQueue.push(clean);
        playAudio();
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

// Process message from database
function processClaudeMessage(messageJson) {
    try {
        const msg = JSON.parse(messageJson);
        if (!msg.content) return;
        
        // Extract text content from the message
        const textParts = [];
        
        for (const content of msg.content) {
            if (content.type === 'text') {
                // This is the clean text without any terminal formatting!
                const text = content.text.trim();
                
                // Filter out tool-related messages
                if (!text.match(/^(Updating|Updated|Creating|Created|Running|Executing|Processing|Analyzing|Searching|Loading|Saving|Building|Installing|Deleting|Removing|Adding|Modifying)/i)) {
                    // Split into sentences for better TTS flow
                    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
                    textParts.push(...sentences);
                }
            }
        }
        
        // Speak each significant text part
        textParts.forEach(text => {
            if (text.trim().length > 15) {
                speak(text.trim());
            }
        });
        
    } catch (e) {
        console.error('Error parsing message:', e);
    }
}

// Database monitoring mode
function startDatabaseMode() {
    if (!sqliteAvailable || !fs.existsSync(CLAUDE_DB_PATH)) {
        console.error('Database mode not available');
        return false;
    }
    
    console.log('🎤 ClaudeVoice DB Mode - Reading from clean database');
    console.log('Commands: //stfu or Ctrl+C to stop TTS\n');
    
    const db = new sqlite3.Database(CLAUDE_DB_PATH, sqlite3.OPEN_READONLY);
    
    // Monitor for new messages
    let checkInterval = setInterval(() => {
        const query = `
            SELECT message, timestamp 
            FROM assistant_messages 
            WHERE timestamp > ? 
            ORDER BY timestamp ASC
        `;
        
        db.all(query, [lastMessageTimestamp], (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return;
            }
            
            rows.forEach(row => {
                processClaudeMessage(row.message);
                lastMessageTimestamp = row.timestamp;
            });
        });
    }, 500); // Check every 500ms
    
    // Handle interrupt commands
    process.stdin.on('data', (data) => {
        const input = data.toString().trim();
        if (input.includes('//stfu') || input.includes('cvstfu!')) {
            stopAllTTS();
        }
    });
    
    // Cleanup on exit
    process.on('SIGINT', () => {
        clearInterval(checkInterval);
        stopAllTTS();
        db.close();
        process.exit(0);
    });
    
    return true;
}

// Terminal parsing mode (fallback)
function startTerminalMode(claudeArgs) {
    console.log('🎤 ClaudeVoice Terminal Mode');
    
    const claudeBin = findClaude();
    const command = '/usr/bin/script';
    const commandArgs = ['-q', '/dev/null', claudeBin, ...claudeArgs];
    
    const claude = spawn(command, commandArgs, {
        stdio: ['inherit', 'pipe', 'inherit'],
        env: { ...process.env, TERM: 'xterm-256color' },
        shell: false
    });
    
    // Simple terminal parsing - just look for lines that seem like explanations
    let buffer = '';
    claude.stdout.on('data', (chunk) => {
        process.stdout.write(chunk);
        
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        lines.forEach(line => {
            if (line.includes('//stfu') || line.includes('cvstfu!')) {
                stopAllTTS();
                return;
            }
            
            // Very simple heuristic: speak lines that look like sentences
            const clean = line.replace(/\x1b\[[^m]*m/g, '').trim();
            if (clean.length > 30 && 
                clean.match(/^[A-Z]/) && 
                clean.match(/[.!?]$/) &&
                !clean.match(/^(Running|Reading|Writing|Creating|✓|✗|\[)/)) {
                speak(clean);
            }
        });
    });
    
    claude.on('exit', (code) => {
        if (buffer) {
            const clean = buffer.replace(/\x1b\[[^m]*m/g, '').trim();
            if (clean.length > 30) speak(clean);
        }
        setTimeout(() => process.exit(code || 0), 200);
    });
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

// Voice menu
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
    console.log('ClaudeVoice DB - Clean TTS from Claude\'s database');
    console.log('\nUsage:');
    console.log('  claudevoice-db              Monitor database for new messages');
    console.log('  claudevoice-db [command]    Run command and speak output');
    console.log('\nOptions:');
    console.log('  --voice <number>  Change voice (1-15)');
    console.log('  --list-voices     List available voices');
    console.log('  --terminal        Force terminal parsing mode');
    console.log('  --help            Show this help');
    console.log('\nThis version reads from Claude\'s clean database,');
    console.log('avoiding all terminal parsing issues!');
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
        audioQueue.push(`Hello! I'm ${newVoice.name}, your new Claude Code voice.`);
        playAudio();
        
        setTimeout(() => process.exit(0), 3000);
    } else {
        console.error('Invalid voice number. Use --list-voices to see options.');
        process.exit(1);
    }
    return;
}

// Decide mode
const forceTerminal = args.includes('--terminal');
args = args.filter(arg => arg !== '--terminal');

if (args.length === 0 && !forceTerminal && sqliteAvailable) {
    // No arguments - start database monitoring mode
    if (!startDatabaseMode()) {
        console.log('Falling back to terminal mode...');
        startTerminalMode([]);
    }
} else {
    // Arguments provided or terminal mode forced
    if (args[0] === '--voice') args = args.slice(2);
    if (args.length > 0 && !args[0].startsWith('-')) {
        args = [args.join(' ')];
    }
    startTerminalMode(args);
}