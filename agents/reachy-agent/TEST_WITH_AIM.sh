#!/bin/bash
# Test script for Reachy Agent with local AIM endpoint

AIM_URL="http://localhost:8000"
AIM_API_KEY="sk-your-api-key"  # Update if your AIM requires an API key
TASK_PROMPT="What does p95 latency mean and why should I care?"

echo "🚀 Testing Reachy Agent with AIM endpoint: $AIM_URL"
echo ""

# Submit task
echo "📤 Submitting task..."
TASK_RESPONSE=$(curl -s -X POST http://localhost:9001/v1/tasks \
  -H "Content-Type: application/json" \
  -d "{
    \"task_type\": \"reachy_devops_copilot\",
    \"input\": {
      \"prompt\": \"$TASK_PROMPT\",
      \"model\": \"Qwen/Qwen3-32B\"
    },
    \"routing\": {
      \"backend\": \"aim\",
      \"base_url\": \"$AIM_URL\",
      \"api_key\": \"$AIM_API_KEY\"
    },
    \"policy\": {
      \"e2e_slo_ms\": 2500,
      \"timeout_ms\": 2200
    }
  }")

echo "Response: $TASK_RESPONSE"
echo ""

# Extract task_id (requires jq, or manually copy from response)
if command -v jq &> /dev/null; then
    TASK_ID=$(echo $TASK_RESPONSE | jq -r '.task_id')
    echo "📋 Task ID: $TASK_ID"
    echo ""
    
    # Wait a moment for processing
    echo "⏳ Waiting for task to complete..."
    sleep 3
    
    # Check status
    echo "📊 Checking task status..."
    curl -s http://localhost:9001/v1/tasks/$TASK_ID | jq '.'
    
    echo ""
    echo "✅ Check the 'result' field for the AI response"
    echo "📈 Check 'e2e_ms' and 'aim_latency_ms' for performance metrics"
else
    echo "⚠️  jq not found. Please manually check task status:"
    echo "   curl http://localhost:9001/v1/tasks/{task_id}"
    echo ""
    echo "Or install jq: sudo apt install jq"
fi

