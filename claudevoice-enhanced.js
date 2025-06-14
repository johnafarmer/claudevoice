#!/usr/bin/env node

/**
 * Enhanced ClaudeVoice with improved garbage filtering
 */

const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Debug mode from environment
const DEBUG = process.env.CLAUDEVOICE_DEBUG === '1';
const DEBUG_FILE = DEBUG ? path.join(os.tmpdir(), `claudevoice-debug-${Date.now()}.log`) : null;

function debugLog(message) {
    if (DEBUG) {
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] ${message}\n`;
        fs.appendFileSync(DEBUG_FILE, logLine);
        console.error(`[DEBUG] ${message}`);
    }
}

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

// Available Edge-TTS voices (truncated for brevity)
const VOICES = [
    { id: 'en-US-BrianNeural', name: 'Brian', desc: 'Clear male voice' }
];

// Enhanced garbage detection
class GarbageFilter {
    constructor() {
        // Track recent lines to detect patterns
        this.recentLines = [];
        this.maxRecentLines = 10;
        
        // Approval state
        this.approvalActive = false;
        this.approvalTimer = null;
        
        // Known garbage patterns
        this.garbagePatterns = [
            // Basic patterns
            /^[0-9]+[a-z]+[0-9]*$/i,              // Like "99a", "2k1a"
            /^[a-z]+[0-9]+[a-z]*$/i,              // Like "a99", "abc123"
            /^\??\d{3,4}[lh]\d*$/i,               // Terminal sequences like "?1004l", "1004l99"
            /^[lh]$/i,                            // Single l or h
            /^\d+[lh]\d*$/i,                      // Numbers followed by l/h
            /^[a-z]{1,2}\d{1,2}[a-z]{0,2}$/i,    // Short alphanumeric garbage
            /^\d{3,4}[lh]\d{1,3}$/i,             // Specific pattern like 1004l99
            
            // Enhanced repetition pattern for "2k1a"
            /^((2k1a|two\s*k\s*one\s*a)\s*)+g?$/i,
            
            // Individual known garbage
            /^(1a2k|2k1a|1004l|99|2k|1a|1004l99|two\s*k\s*one\s*a)$/i
        ];
        
        // Exact matches
        this.exactGarbage = new Set(['g', '99', 'l', 'h']);
    }
    
    setApprovalState(active) {
        this.approvalActive = active;
        debugLog(`Approval state set to: ${active}`);
        
        // Clear any existing timer
        if (this.approvalTimer) {
            clearTimeout(this.approvalTimer);
        }
        
        // Set timeout to clear approval state
        if (active) {
            this.approvalTimer = setTimeout(() => {
                this.approvalActive = false;
                debugLog('Approval state cleared by timeout');
            }, 10000); // 10 seconds
        }
    }
    
    isGarbage(text) {
        const clean = text.trim();
        
        // Empty or very short
        if (clean.length < 3) {
            debugLog(`Filtered (too short): "${clean}"`);
            return true;
        }
        
        // During approval, be more aggressive
        if (this.approvalActive && clean.length < 20) {
            // Check if it looks like garbage
            if (clean.match(/^[a-z0-9\s]+$/i)) {
                debugLog(`Filtered (approval garbage): "${clean}"`);
                return true;
            }
        }
        
        // Exact matches
        if (this.exactGarbage.has(clean.toLowerCase())) {
            debugLog(`Filtered (exact match): "${clean}"`);
            return true;
        }
        
        // Pattern matching
        for (const pattern of this.garbagePatterns) {
            if (pattern.test(clean)) {
                debugLog(`Filtered (pattern ${pattern}): "${clean}"`);
                return true;
            }
        }
        
        // Check recent lines for repetition
        this.recentLines.push(clean);
        if (this.recentLines.length > this.maxRecentLines) {
            this.recentLines.shift();
        }
        
        // Detect repetitive patterns
        if (this.recentLines.length >= 3) {
            const last3 = this.recentLines.slice(-3);
            if (last3.every(line => line === clean) && clean.match(/^[a-z0-9]+$/i)) {
                debugLog(`Filtered (repetition detected): "${clean}"`);
                return true;
            }
        }
        
        return false;
    }
}

// Check if message is tool-related
function isToolRelatedMessage(message) {
    const toolVerbs = /^(Updat|Modif|Chang|Add|Remov|Delet|Mark|Set|Clear|Reset|Edit|Creat|Writ|Read|Fetch|Load|Save|Track|Complet|Finish|Start|Init|Setup|Config|Install|Build|Run|Test|Deploy|Process|Analyz|Search|Check|Fix|Execut|Perform|Apply|Transform|Convert|Format|Import|Export|Generat|Calculat|Validat|Pars|Compil|Optimiz|Refactor|Migrat|Backup|Restor|Sync|Download|Upload)(ing|ed|e|es)?\s/i;
    
    if (toolVerbs.test(message)) {
        const toolTargets = /(todo|task|item|list|file|code|function|variable|config|setting|database|cache|state|status|progress|component|module|package|dependency|test|build|deployment)/i;
        return toolTargets.test(message);
    }
    
    return false;
}

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
let spokenMessages = new Set();

// Enhanced speech queue with filtering
class SpeechQueue {
    constructor() {
        this.queue = [];
        this.spoken = new Set();
        this.playing = false;
        this.filter = new GarbageFilter();
    }
    
    async add(text) {
        const clean = text.trim();
        
        // Skip if garbage
        if (this.filter.isGarbage(clean)) {
            return;
        }
        
        // Skip if already spoken or similar
        if (this.spoken.has(clean)) {
            debugLog(`Skipped (duplicate): "${clean}"`);
            return;
        }
        
        // Check for substrings
        for (const spoken of this.spoken) {
            if (spoken.includes(clean) || clean.includes(spoken)) {
                debugLog(`Skipped (substring): "${clean}"`);
                return;
            }
        }
        
        // Skip tool messages
        if (isToolRelatedMessage(clean)) {
            debugLog(`Skipped (tool message): "${clean}"`);
            return;
        }
        
        // Add to queue
        if (clean.length > 10) {
            debugLog(`Queuing for speech: "${clean}"`);
            this.spoken.add(clean);
            this.queue.push(clean);
            this.play();
            
            // Cleanup old entries
            if (this.spoken.size > 100) {
                const entries = Array.from(this.spoken);
                entries.slice(0, 50).forEach(e => this.spoken.delete(e));
            }
        }
    }
    
    async play() {
        if (this.playing || this.queue.length === 0) return;
        
        this.playing = true;
        const text = this.queue.shift();
        
        try {
            const tempFile = path.join(os.tmpdir(), `claude-${Date.now()}.mp3`);
            await tts.ttsPromise(text, tempFile);
            
            const player = process.platform === 'darwin' ? 'afplay' :
                           process.platform === 'win32' ? 'powershell' : 'aplay';
            const args = process.platform === 'win32' ? 
                ['-c', `(New-Object Media.SoundPlayer '${tempFile}').PlaySync()`] : [tempFile];
            
            const proc = spawn(player, args, { stdio: 'ignore' });
            proc.on('exit', () => {
                try { fs.unlinkSync(tempFile); } catch {}
                this.playing = false;
                this.play();
            });
        } catch (err) {
            debugLog(`TTS error: ${err.message}`);
            this.playing = false;
            this.play();
        }
    }
    
    clear() {
        this.queue = [];
        this.spoken.clear();
    }
}

// Initialize speech queue
const speechQueue = new SpeechQueue();

// Enhanced line processor
class LineProcessor {
    constructor(speechQueue) {
        this.speechQueue = speechQueue;
        this.messageBuffer = [];
        this.collectingMessage = false;
        this.lastProcessedLine = '';
    }
    
    process(line) {
        // Filter out OSC sequences
        if (line.includes('\x1b]99;') || line.includes(']99;')) {
            debugLog(`Filtered OSC sequence`);
            return;
        }
        
        // Strip escape sequences
        const stripped = line.replace(/\x1b\[[^m]*m/g, '').replace(/\x1b\]?[^\x1b\x07]*[\x1b\x07]/g, '');
        const clean = stripped.trim();
        
        // Skip if same as last line (prevent loops)
        if (clean === this.lastProcessedLine) {
            debugLog(`Skipped duplicate line: "${clean}"`);
            return;
        }
        this.lastProcessedLine = clean;
        
        // Debug log all lines during approval
        if (this.speechQueue.filter.approvalActive) {
            debugLog(`During approval - line: "${clean}"`);
        }
        
        // Check for approval prompt patterns
        if (this.detectApprovalPrompt(clean)) {
            this.speechQueue.filter.setApprovalState(true);
            this.speechQueue.add(clean);
            return;
        }
        
        // Check for approval options
        if (this.detectApprovalOptions(clean)) {
            this.speechQueue.filter.setApprovalState(true);
            return;
        }
        
        // Process bullet points
        if (clean.startsWith('⏺')) {
            const content = clean.substring(1).trim();
            if (this.shouldSpeak(content)) {
                this.messageBuffer = [content];
                this.collectingMessage = true;
            }
            return;
        }
        
        // Continue collecting or stop
        if (this.collectingMessage) {
            if (this.shouldStopCollecting(clean)) {
                this.flushBuffer();
            } else if (clean) {
                this.messageBuffer.push(clean);
            }
        }
    }
    
    detectApprovalPrompt(text) {
        return text.length > 20 && (
            text.includes('Do you want to') ||
            (text.includes('approval') && text.includes('?')) ||
            text.includes('permission to') ||
            text.includes('Would you like') ||
            text.includes('Shall I') ||
            text.includes('Should I') ||
            text.includes('needs permission to') ||
            text.includes('requires approval')
        );
    }
    
    detectApprovalOptions(text) {
        return (
            text.match(/^(1|2|3)\.\s*(Allow|Always allow|Decline)/i) ||
            text.includes('Allow this time') ||
            text.includes('Always allow') ||
            text.includes('Decline and give feedback')
        );
    }
    
    shouldSpeak(content) {
        return content && 
            !content.includes('(MCP)') &&
            !content.includes('asana:') &&
            !content.includes('github:') &&
            !content.includes('obsidian:') &&
            !content.startsWith('Using') &&
            !content.match(/^\w+\(/) &&
            !isToolRelatedMessage(content) &&
            content.length > 10;
    }
    
    shouldStopCollecting(text) {
        return !text || 
            text.startsWith('✻') ||
            text.startsWith('✽') ||
            text.startsWith('·') ||
            text.startsWith('╭') ||
            text.startsWith('│') ||
            text.startsWith('╰') ||
            text.includes('tokens') ||
            text.includes('esc to interrupt') ||
            text.includes('(MCP)') ||
            text.includes('asana:') ||
            text.includes('github:') ||
            text.includes('obsidian:') ||
            text.startsWith('Using') ||
            text.match(/^\w+\(/);
    }
    
    flushBuffer() {
        if (this.messageBuffer.length > 0) {
            const message = this.messageBuffer.join(' ');
            this.speechQueue.add(message);
        }
        this.messageBuffer = [];
        this.collectingMessage = false;
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

// Main execution
const args = process.argv.slice(2);

// Handle help/version/voice commands
if (args[0] === '--help') {
    console.log('ClaudeVoice Enhanced - TTS for Claude Code');
    console.log('Usage: claudevoice [options] [claude arguments]');
    console.log('\nOptions:');
    console.log('  --debug           Enable debug logging');
    console.log('  --help            Show this help');
    process.exit(0);
}

// Enable debug if requested
if (args[0] === '--debug') {
    process.env.CLAUDEVOICE_DEBUG = '1';
    args.shift();
}

if (DEBUG) {
    console.error(`Debug log: ${DEBUG_FILE}`);
    debugLog('Starting ClaudeVoice Enhanced');
}

// Initialize processor
const processor = new LineProcessor(speechQueue);

// Spawn claude
const claudeBin = findClaude();
const command = '/usr/bin/script';
const commandArgs = ['-q', '/dev/null', claudeBin, ...args];

debugLog(`Spawning: ${command} ${commandArgs.join(' ')}`);

const claude = spawn(command, commandArgs, {
    stdio: ['inherit', 'pipe', 'inherit'],
    env: { ...process.env, TERM: 'xterm-256color' },
    shell: false
});

// Process output
let buffer = '';
claude.stdout.on('data', (chunk) => {
    // Pass through to terminal
    process.stdout.write(chunk);
    
    // Check for mouse tracking disable (indicates approval dialog)
    const chunkStr = chunk.toString();
    if (chunkStr.includes('\x1b[?1004l')) {
        debugLog('Detected mouse tracking disable - approval dialog active');
        speechQueue.filter.setApprovalState(true);
    }
    
    // Process lines
    buffer += chunkStr;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
        processor.process(line);
    }
});

// Handle exit
claude.on('exit', (code) => {
    if (buffer) {
        processor.process(buffer);
    }
    
    processor.flushBuffer();
    
    if (DEBUG) {
        debugLog(`Exiting with code: ${code}`);
    }
    
    setTimeout(() => process.exit(code || 0), 200);
});

// Handle interrupt
process.on('SIGINT', () => {
    debugLog('Received SIGINT');
    speechQueue.clear();
    claude.kill('SIGINT');
});