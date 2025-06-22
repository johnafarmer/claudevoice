#!/bin/bash

# Specific test cases for capturing Claude terminal patterns
# Run this INSIDE the capture session

echo "=== Running ClaudeVoice Terminal Pattern Tests ==="
echo ""
echo "Each test will be clearly marked. Wait for each to complete before continuing."
echo ""

run_test() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "TEST: $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Command: $2"
    echo "Starting in 2 seconds..."
    sleep 2
    eval "$2"
    echo ""
    echo "Test complete. Waiting 3 seconds..."
    sleep 3
}

# Test 1: Simple query (baseline)
run_test "Simple Query" 'claude "What is 2+2?"'

# Test 2: Multi-line response
run_test "Multi-line Response" 'claude "List 3 benefits of exercise"'

# Test 3: File creation (triggers approval)
run_test "File Creation with Approval" 'claude "Create a file called test-capture.txt with the content: Hello from capture test"'

# Test 4: File editing (triggers approval)
run_test "File Edit with Approval" 'claude "Add a second line to test-capture.txt saying: This is line 2"'

# Test 5: Todo creation
run_test "Todo Creation" 'claude "Create a todo list for building a simple web app"'

# Test 6: Todo updates
run_test "Todo Updates" 'claude "Update the todo list - mark the first item as complete"'

# Test 7: Error handling
run_test "Error Scenario" 'claude "Read the file /this/does/not/exist.txt"'

# Test 8: Code explanation with output
run_test "Code Explanation" 'claude "Explain what this bash command does: find . -name \"*.js\" | wc -l"'

# Test 9: Multiple tool usage
run_test "Multiple Tools" 'claude "Check if package.json exists, if not create one with basic Node.js setup"'

# Test 10: Long output handling
run_test "Long Output" 'claude "List all the JavaScript array methods with brief descriptions"'

# Test 11: Plan mode trigger
run_test "Plan Mode" 'claude "/plan Create a REST API with authentication"'

# Test 12: Compact mode (if you have history)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST: Compact Mode"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "First, let's create some history..."
claude "What is the capital of France?"
sleep 2
claude "What is the capital of Japan?"
sleep 2
echo "Now triggering /compact..."
claude "/compact"
sleep 3

# Test 13: Interrupt test (for //stfu)
run_test "Interrupt Test" 'claude "Count slowly from 1 to 20" & sleep 3 && echo "//stfu"'

echo ""
echo "=== ALL TESTS COMPLETE ==="
echo ""
echo "Exit the capture session to analyze the results."
echo ""