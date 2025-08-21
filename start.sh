#!/bin/bash
# --- Convenience Script to Start the WebRTC VLM Demo ---

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker does not seem to be running, please start it and try again."
  exit 1
fi

# Check if SSL certificate files exist
if [ ! -f "server/localhost+2-key.pem" ] || [ ! -f "server/localhost+2.pem" ]; then
  echo "⚠️ SSL certificates not found."
  echo "Please run the following command in the 'server' directory first:"
  echo "mkcert localhost 127.0.0.1 <your-ip-address>"
  exit 1
fi

echo "🚀 Starting the WebRTC VLM Application..."

# Use Docker Compose to build and run the container in the background (-d)
docker-compose -f docker-compose.yml up --build -d

echo "✅ Application is running."
echo "Access it at: https://<your-ip-address>:8080"
echo "To view logs, run: docker logs -f webrtc-vlm-app"
echo "To stop the application, run: docker-compose down"
