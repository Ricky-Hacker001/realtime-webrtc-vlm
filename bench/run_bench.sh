#!/bin/bash

# --- Benchmark Script ---

DURATION=${1:-30} # Default to 30 seconds if no duration is provided

echo "--- Starting Benchmark ---"
echo "This test will run for ${DURATION} seconds."
echo "Please start the phone-to-laptop stream now."

# Give the user time to set up the stream
echo "You have 10 seconds to scan the QR code and click 'Start Session'..."
sleep 10

echo "Benchmark running..."
sleep $DURATION

echo "Benchmark finished. Collecting metrics..."

# Use Docker to execute a command inside the running container.
# This command uses 'curl' to send a JavaScript command to the browser's debugger,
# which triggers the downloadMetrics() function.
# NOTE: This requires the browser to be started with the --remote-debugging-port=9222 flag.
# For this task, we'll simulate this by reminding the user to manually trigger it.

echo "------------------------------------------------------------------"
echo "✅ MANUAL STEP REQUIRED:"
echo "1. Go to your laptop's browser tab where the demo is running."
echo "2. Open the Developer Console (F12 or Cmd+Option+I)."
echo "3. Type the following command and press Enter:"
echo "downloadMetrics()"
echo "4. The 'metrics.json' file will be downloaded to your computer."
echo "------------------------------------------------------------------"

