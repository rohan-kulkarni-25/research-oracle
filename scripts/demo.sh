#!/bin/bash
# Research Oracle Demo Script

BASE_URL="http://localhost:3000/api/v1"

echo "=== Research Oracle Demo ==="
echo ""

# Function to make estimate request
estimate() {
  echo "Question: $1"
  echo ""
  result=$(curl -s -X POST "$BASE_URL/estimate" \
    -H "Content-Type: application/json" \
    -d "{\"question\": \"$1\"}")

  # Extract key fields
  prob=$(echo $result | jq -r '.estimate.combined.estimate')
  conf=$(echo $result | jq -r '.estimate.combined.confidence')
  agree=$(echo $result | jq -r '.estimate.combined.agreement')

  echo "   Combined: $(echo "scale=0; $prob * 100" | bc)% ($conf confidence)"
  echo "   Agreement: $agree"
  echo ""

  # Show individual analysts
  echo "   Analysts:"
  echo "   - Base Rate: $(echo $result | jq -r '.estimate.estimates.baseRate.estimate * 100')%"
  echo "   - Evidence:  $(echo $result | jq -r '.estimate.estimates.evidence.estimate * 100')%"
  echo "   - Contrarian: $(echo $result | jq -r '.estimate.estimates.contrarian.estimate * 100')%"
  echo ""
  echo "---"
  echo ""

  sleep 2  # Rate limiting
}

# Demo queries
estimate "Will Bitcoin exceed \$150,000 by June 2026?"
estimate "Will there be a US recession in 2026?"
estimate "Will Solana's daily active users exceed 5 million by end of 2026?"

# Show calibration
echo "Oracle Calibration Stats:"
curl -s "$BASE_URL/calibration" | jq '.brierScore, .totalPredictions, .totalResolved'

echo ""
echo "=== Demo Complete ==="
