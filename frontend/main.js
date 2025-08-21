// frontend/main.js (Final Version)

// ===================================================================
// CONFIGURATION
// ===================================================================
const YOUR_LAPTOP_IP = 'YOUR_LAPTOP_IP';

// ===================================================================
// ELEMENT SELECTORS & GLOBAL VARIABLES
// ===================================================================
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const overlayCanvas = document.getElementById('overlayCanvas');
const qrCodeContainer = document.getElementById('qrCodeContainer');
const instructionText = document.getElementById('instructionText');
const startButton = document.getElementById('startButton');
const ctx = overlayCanvas.getContext('2d');

let myRole = '';
let pingInterval;
const MODEL_INPUT_SHAPE = [1, 3, 640, 640];

// ===================================================================
// ROLE DETERMINATION
// ===================================================================
const urlParams = new URLSearchParams(window.location.search);
myRole = urlParams.get('role') === 'phone' ? 'caller' : 'callee';
console.log(`My determined role is: ${myRole}`);

if (myRole === 'callee') {
    const phoneUrl = `https://${YOUR_LAPTOP_IP}:8080/?role=phone`;
    new QRCode(qrCodeContainer, { text: phoneUrl, width: 128, height: 128 });
    instructionText.innerText = "Scan QR with your phone to connect...";
} else {
    instructionText.innerText = "Connecting as phone...";
    qrCodeContainer.style.display = 'none';
    startButton.style.display = 'none';
}

// ===================================================================
// WEBRTC & SIGNALING SETUP
// ===================================================================
console.log(`Attempting to connect WebSocket to wss://${YOUR_LAPTOP_IP}:8080`);
const ws = new WebSocket(`wss://${YOUR_LAPTOP_IP}:8080`);

const peerConnection = new RTCPeerConnection({
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ]
});

async function startMedia(stream) {
    localVideo.srcObject = stream;
    try {
        await localVideo.play();
    } catch (err) { /* Ignore */ }
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
}

ws.onmessage = async (message) => {
    if (message.data === 'pong') return;
    const data = JSON.parse(message.data);
    if (data.type !== 'candidate') console.log(`📬 [ws.onmessage] Received message: ${data.type}`);

    try {
        switch (data.type) {
            case 'initiate_call':
                if (myRole === 'caller') {
                    const offer = await peerConnection.createOffer();
                    await peerConnection.setLocalDescription(offer);
                    ws.send(JSON.stringify({ type: 'offer', sdp: offer.sdp }));
                }
                break;
            case 'offer':
                if (myRole === 'callee') {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);
                    ws.send(JSON.stringify({ type: 'answer', sdp: answer.sdp }));
                }
                break;
            case 'answer':
                if (myRole === 'caller') {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
                }
                break;
            case 'candidate':
                if (data.candidate) await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                break;
        }
    } catch (err) {
        console.error(`❌ Error during signaling (type ${data.type}):`, err);
    }
};

peerConnection.onicecandidate = (event) => {
    if (event.candidate) ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
};

peerConnection.oniceconnectionstatechange = () => {
    console.log(`ICE Connection State Change: ${peerConnection.iceConnectionState}`);
};

peerConnection.ontrack = (event) => {
    console.log(`🎉 [peerConnection.ontrack] Received remote track!`);
    if (remoteVideo.srcObject !== event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
        // FIX: Enable the start button now that the stream is ready
        instructionText.innerText = "Stream received. Click Start Session to begin.";
        startButton.disabled = false;
    }
};

startButton.onclick = () => {
    console.log('Start button clicked. Attempting to play remote video.');
    remoteVideo.play().then(() => {
        console.log('Remote video playback started successfully.');
        instructionText.innerText = "Connection established. Running detection...";
        startButton.style.display = 'none';
        qrCodeContainer.style.display = 'none';
        loadModelAndRunDetection();
    }).catch(e => {
        console.error("Error playing remote video:", e);
        instructionText.innerText = "Error: Could not play video. Check console.";
    });
};

ws.onopen = () => {
    console.log('✅ [ws.onopen] Connected to signaling server');
    ws.send(JSON.stringify({ type: 'join', role: myRole }));
    pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping');
    }, 10000);

    if (myRole === 'caller') {
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(startMedia)
            .catch(error => alert(`Camera Error: ${error.name}`));
    }
};
ws.onclose = () => clearInterval(pingInterval);

// ===================================================================
// OBJECT DETECTION (ONNX)
// ===================================================================
async function loadModelAndRunDetection() {
    console.log("Loading model...");
    try {
        ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
        const session = await ort.InferenceSession.create('./model/yolov5nu.onnx');
        console.log("✅ Model loaded successfully.");
        runDetectionLoop(session);
    } catch (error) {
        console.error("Failed to load the model:", error);
        instructionText.innerText = "Error: Failed to load AI model. Check console and file path.";
    }
}

function runDetectionLoop(session) {
    if (remoteVideo.paused || remoteVideo.ended) return;
    const { videoWidth, videoHeight } = remoteVideo;
    overlayCanvas.width = videoWidth;
    overlayCanvas.height = videoHeight;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 640;
    tempCanvas.height = 640;
    tempCanvas.getContext('2d').drawImage(remoteVideo, 0, 0, 640, 640);
    const inputTensor = preprocess(tempCanvas);

    runInference(session, inputTensor).then(outputTensor => {
        const boxes = postprocess(outputTensor, videoWidth, videoHeight);
        ctx.clearRect(0, 0, videoWidth, videoHeight);
        drawBoundingBoxes(ctx, boxes);
        requestAnimationFrame(() => runDetectionLoop(session));
    });
}

function preprocess(canvas) {
    const { data } = canvas.getContext('2d').getImageData(0, 0, 640, 640);
    const red = [], green = [], blue = [];
    for (let i = 0; i < data.length; i += 4) {
        red.push(data[i] / 255);
        green.push(data[i + 1] / 255);
        blue.push(data[i + 2] / 255);
    }
    return new ort.Tensor('float32', [...red, ...green, ...blue], MODEL_INPUT_SHAPE);
}

async function runInference(session, inputTensor) {
    const feeds = { 'images': inputTensor };
    return (await session.run(feeds)).output0;
}

function postprocess(outputTensor, videoWidth, videoHeight) {
    const { data } = outputTensor;
    const boxes = [];
    for (let i = 0; i < data.length; i += 85) {
        const score = data[i + 4];
        if (score > 0.5) {
            const [x_center, y_center, w, h] = data.slice(i, i + 4);
            boxes.push({
                x: (x_center - w / 2) * (videoWidth / 640),
                y: (y_center - h / 2) * (videoHeight / 640),
                w: w * (videoWidth / 640),
                h: h * (videoHeight / 640),
                label: 'object',
                score: score.toFixed(2)
            });
        }
    }
    return boxes;
}

function drawBoundingBoxes(ctx, boxes) {
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#00FF00';
    boxes.forEach(box => {
        ctx.strokeRect(box.x, box.y, box.w, box.h);
        ctx.fillText(`${box.label} ${box.score}`, box.x, box.y > 20 ? box.y - 10 : 20);
    });
}
