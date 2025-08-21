// server/server.js (Final Version)
const WebSocket = require('ws');
const https = require('https');
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// --- SSL Certificate Setup ---
const keyPath = path.join(__dirname, 'localhost+2-key.pem');
const certPath = path.join(__dirname, 'localhost+2.pem');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.error('❌ FATAL ERROR: SSL certificate files not found.');
    console.error('Please run "mkcert localhost 127.0.0.1 <your-ip-address>" in the "server" directory.');
    process.exit(1);
}

const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
};

const server = https.createServer(options, app);
app.use(express.static(path.join(__dirname, '..', 'frontend')));
const wss = new WebSocket.Server({ server });

console.log('🚀 Web server starting on https://localhost:8080');

// Use a simple object to manage a single "room"
let room = { caller: null, callee: null };

wss.on('connection', ws => {
    console.log('\n✅ Client connected. Waiting for role announcement.');

    ws.on('message', message => {
        // FIX: Handle non-JSON ping/pong messages first
        if (message.toString() === 'ping') {
            ws.send('pong');
            return;
        }

        const data = JSON.parse(message.toString());

        if (data.type === 'join' && !ws.role) {
            if (data.role === 'caller' && !room.caller) {
                ws.role = 'caller';
                room.caller = ws;
                console.log(`[Assignment] Client registered as: ${ws.role}`);
            } else if (data.role === 'callee' && !room.callee) {
                ws.role = 'callee';
                room.callee = ws;
                console.log(`[Assignment] Client registered as: ${ws.role}`);
            } else {
                console.log(`[Assignment] Role ${data.role} is invalid or already taken. Disconnecting.`);
                ws.close();
                return;
            }

            if (room.caller && room.callee) {
                console.log('▶️ [Notification] Both peers present. Notifying Caller to initiate call.');
                if (room.caller.readyState === WebSocket.OPEN) {
                    room.caller.send(JSON.stringify({ type: 'initiate_call' }));
                }
            }
            return;
        }

        const senderRole = ws.role;
        const target = (senderRole === 'caller') ? room.callee : room.caller;
        
        if (target && target.readyState === WebSocket.OPEN) {
            target.send(message.toString());
        }
    });

    ws.on('close', () => {
        const role = ws.role;
        console.log(`❌ Client (${role || 'unknown'}) disconnected.`);
        if (role === 'caller') room.caller = null;
        if (role === 'callee') room.callee = null;
    });

    ws.on('error', (error) => console.error(`WebSocket error from ${ws.role || 'unknown'}:`, error));
});

server.listen(8080, () => {
    console.log('✅ Server is listening securely on port 8080');
});
