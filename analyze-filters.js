#!/usr/bin/env node

/**
 * Analyze and test the garbage filtering patterns
 */

// Current patterns from claudevoice lines 208-217
const patterns = [
    { regex: /^[0-9]+[a-z]+[0-9]*$/i, desc: 'Like "99a", "2k1a"' },
    { regex: /^[a-z]+[0-9]+[a-z]*$/i, desc: 'Like "a99", "abc123"' },
    { regex: /^\??\d{3,4}[lh]\d*$/i, desc: 'Terminal sequences like "?1004l", "1004l99"' },
    { regex: /^(1a2k|2k1a|1004l|99|2k|1a|1004l99|two\s*k\s*one\s*a)/i, desc: 'Known garbage patterns' },
    { regex: /^[lh]$/i, desc: 'Single l or h' },
    { regex: /^\d+[lh]\d*$/i, desc: 'Numbers followed by l/h and optional numbers' },
    { regex: /^[a-z]{1,2}\d{1,2}[a-z]{0,2}$/i, desc: 'Short alphanumeric garbage' },
    { regex: /^\d{3,4}[lh]\d{1,3}$/i, desc: 'Specific pattern like 1004l99' },
    { exact: 'g', desc: 'Single "g" character' }
];

// Test cases - known garbage that should be filtered
const garbageTests = [
    '2k1a', '2k1a2k1a', '99', '99a', 'a99', '1004l', '1004l99', '?1004l',
    'l', 'h', '99l', '1004h', 'a1b', 'ab12', 'g', '1a2k', '2k', '1a',
    'two k one a', 'two  k  one  a', 'ab1cd', 'x99y'
];

// Test cases - legitimate text that should NOT be filtered
const legitTests = [
    'Hello world',
    'The answer is 42',
    'Creating file test.txt',
    'I will help you with that',
    'Here is the solution',
    'Processing request',
    'This is a longer sentence that should not be filtered'
];

console.log('=== ClaudeVoice Garbage Filter Analysis ===\n');

// Test garbage filtering
console.log('Testing GARBAGE patterns (should be filtered):');
console.log('─'.repeat(50));

let missedGarbage = [];
for (const test of garbageTests) {
    let matched = false;
    let matchedBy = [];
    
    // Check exact match
    if (test === 'g') {
        matched = true;
        matchedBy.push('exact match "g"');
    }
    
    // Check regex patterns
    for (const {regex, desc} of patterns) {
        if (regex && regex.test(test)) {
            matched = true;
            matchedBy.push(desc);
        }
    }
    
    if (matched) {
        console.log(`✓ "${test}" - filtered by: ${matchedBy.join(', ')}`);
    } else {
        console.log(`✗ "${test}" - NOT FILTERED (missed!)`);
        missedGarbage.push(test);
    }
}

console.log('\n\nTesting LEGITIMATE text (should NOT be filtered):');
console.log('─'.repeat(50));

let wronglyFiltered = [];
for (const test of legitTests) {
    let matched = false;
    let matchedBy = [];
    
    // Check exact match
    if (test === 'g') {
        matched = true;
        matchedBy.push('exact match "g"');
    }
    
    // Check regex patterns
    for (const {regex, desc} of patterns) {
        if (regex && regex.test(test)) {
            matched = true;
            matchedBy.push(desc);
        }
    }
    
    if (!matched) {
        console.log(`✓ "${test}" - correctly allowed`);
    } else {
        console.log(`✗ "${test}" - WRONGLY FILTERED by: ${matchedBy.join(', ')}`);
        wronglyFiltered.push(test);
    }
}

// Summary
console.log('\n\n=== Summary ===');
console.log(`Garbage patterns tested: ${garbageTests.length}`);
console.log(`Legitimate text tested: ${legitTests.length}`);
console.log(`Missed garbage: ${missedGarbage.length}`);
console.log(`Wrongly filtered: ${wronglyFiltered.length}`);

if (missedGarbage.length > 0) {
    console.log('\nMissed garbage patterns:');
    missedGarbage.forEach(g => console.log(`  - "${g}"`));
}

if (wronglyFiltered.length > 0) {
    console.log('\nWrongly filtered legitimate text:');
    wronglyFiltered.forEach(t => console.log(`  - "${t}"`));
}

// Analyze the specific "2k1a" repetition issue
console.log('\n\n=== Analyzing "2k1a" repetition patterns ===');
const repetitionTests = [
    '2k1a',
    '2k1a 2k1a',
    '2k1a 2k1a 2k1a',
    '2k1a 2k1a 2k1a 2k1a',
    '2k1a 2k1a 2k1a 2k1a g',
    '2k1a2k1a2k1a2k1ag',
    'two k one a',
    'two k one a two k one a',
    'two k one a g'
];

console.log('Testing repetition patterns:');
for (const test of repetitionTests) {
    // Enhanced pattern for repetitions
    const isRepetition = test.match(/^((2k1a|two\s*k\s*one\s*a)\s*)+g?$/i);
    const isFiltered = patterns.some(p => p.regex && p.regex.test(test)) || test === 'g';
    
    console.log(`"${test}"`);
    console.log(`  Current filter: ${isFiltered ? '✓ filtered' : '✗ NOT filtered'}`);
    console.log(`  Repetition match: ${isRepetition ? '✓ matched' : '✗ not matched'}`);
}

// Suggest improved pattern
console.log('\n\n=== Suggested Improvements ===');
console.log('Add this enhanced pattern to catch repetitions:');
console.log('  /^((2k1a|two\\s*k\\s*one\\s*a)\\s*)+g?$/i');
console.log('\nThis will match:');
console.log('  - Single or multiple "2k1a" repetitions');
console.log('  - With or without spaces between repetitions');
console.log('  - With or without trailing "g"');
console.log('  - Both "2k1a" and "two k one a" variations');