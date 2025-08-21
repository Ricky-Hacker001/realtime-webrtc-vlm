# Real-time WebRTC VLM Multi-Object Detection

**One-line goal:** A reproducible demo that performs real-time multi-object detection on live video streamed from a phone via WebRTC, returns detection bounding boxes to the browser, and overlays them in near real-time.

---


## ✨ Features

-   **Real-time Video Streaming:** Secure, low-latency video streaming from a phone's browser to a laptop's browser using WebRTC.
-   **In-Browser AI/ML:** Object detection is performed directly in the browser using ONNX Runtime with a WebAssembly (WASM) backend, ensuring a low-resource footprint and no need for a powerful server.
-   **QR Code Connection:** Simple and fast connection process using a QR code, eliminating the need to type URLs on the phone.
-   **Reproducible Environment:** The entire application is containerized with Docker, allowing anyone to run it with a single command.
-   **Performance Benchmarking:** Includes a script to automate performance testing and collect key metrics like end-to-end latency and processed FPS.

## 🛠️ Tech Stack

-   **Frontend:** HTML, CSS, JavaScript
-   **Real-time Communication:** WebRTC (for peer-to-peer video and data channels)
-   **AI/ML:** ONNX Runtime Web (with WASM backend) for in-browser inference
-   **Signaling & Web Server:** Node.js with Express and `ws` (WebSocket) library
-   **Containerization:** Docker & Docker Compose

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your development machine:

-   [Docker](https://www.docker.com/products/docker-desktop/) & Docker Compose
-   [Node.js](https://nodejs.org/en/) (v16 or later)
-   [mkcert](https://github.com/FiloSottile/mkcert) for creating trusted local SSL certificates.

## 🚀 Quick Start

Follow these steps to get the application running locally.

### 1. Clone the Repository

```bash
git clone https://github.com/Ricky-Hacker001/realtime-webrtc-vlm.git
cd realtime-webrtc-vlm
```

### 2. Generate SSL Certificates

WebRTC requires a secure (HTTPS) connection to access the camera. We'll use `mkcert` to create a trusted certificate for your local development environment.

First, install a local certificate authority (you only need to do this once):
```bash
mkcert -install
```

Next, find your laptop's local IP address (e.g., `192.168.1.22`).

Now, navigate to the `server` directory and generate the certificates. **Remember to replace `<your-ip-address>` with your actual IP.**

```bash
cd server
mkcert localhost 127.0.0.1 <your-ip-address>
cd ..
```
This will create the necessary certificate files inside the `server` folder.

### 3. Update the IP Address in the Code

Open the `frontend/main.js` file and update the `YOUR_LAPTOP_IP` constant at the top of the file with your laptop's IP address.

### 4. Start the Application

Run the convenience script from the project's root directory:

```bash
./start.sh
```

This will build the Docker image and start the application in a container.

### 5. Connect and Run

1.  Open your laptop's browser and navigate to `https://<your-ip-address>:8080`.
2.  You will see a QR code. Scan this with your phone's camera.
3.  Allow camera permission on your phone.
4.  On your laptop, the "Start Session" button will become enabled once the video stream is received. Click it to begin the object detection.

## 📊 How to Run the Benchmark

The project includes a script to help you collect performance metrics.

1.  Start the application and the video stream as described above.
2.  In a **new terminal window**, run the benchmark script:
    ```bash
    ./bench/run_bench.sh
    ```
3.  Let the test run for the specified duration (default is 30 seconds).
4.  At the end of the test, follow the instructions to open your laptop browser's developer console (F12) and run the `downloadMetrics()` command to save the `metrics.json` file.

## 📂 Project Structure

```
.
├── Dockerfile              # Blueprint for building the application container
├── docker-compose.yml      # Defines how to run the Docker container
├── start.sh                # Convenience script to start the application
├── bench/
│   └── run_bench.sh        # Script to automate performance testing
├── frontend/
│   ├── index.html          # Main HTML page
│   ├── main.js             # Core application logic (WebRTC, ONNX, metrics)
│   ├── style.css           # Basic styling
│   └── model/
│       └── yolov5n.onnx    # The object detection model
└── server/
    └── server.js           # The Node.js signaling and web server
```

## 🧠 Design Choices & Tradeoffs

### Low-Resource Mode (WASM)

The primary operational mode of this demo is a **WASM-based, in-browser inference model**. This choice was made to fulfill the low-resource requirement of the task.

-   **Advantages:**
    -   **Zero Server-Side Compute:** The AI/ML workload is offloaded entirely to the client (the laptop's browser), meaning the server can be a very lightweight, low-cost machine.
    -   **Lower Latency:** By eliminating a network hop to a dedicated inference server, the end-to-end latency is significantly reduced.
    -   **Scalability:** Since the clients handle their own processing, the server only needs to manage signaling connections, making it highly scalable.
-   **Tradeoffs:**
    -   **Client-Side Performance:** The performance is dependent on the capabilities of the client machine. On older laptops, the processed FPS might be lower.
    -   **Model Constraints:** Only models that are optimized for web environments can be used.

### Backpressure Policy

The current backpressure policy is simple and effective for a real-time demo:

-   **Frame Dropping by `requestAnimationFrame`:** The detection loop is driven by the browser's `requestAnimationFrame` cycle. If the object detection for one frame takes longer than a single frame's duration (e.g., > 66ms for a 15 FPS stream), the next call to `runDetectionLoop` will simply grab the *latest* available frame from the video element, effectively dropping any intermediate frames. This prevents a buildup of unprocessed frames and keeps the displayed overlay as close to real-time as possible.

## 🔧 Troubleshooting

-   **Cannot connect from phone:**
    -   Ensure your phone and laptop are on the **same Wi-Fi network**.
    -   Double-check that the `YOUR_LAPTOP_IP` in `main.js` is correct.
    -   Make sure you are using `https://` in the URL.
-   **Camera not working on phone:**
    -   WebRTC requires a secgit push -u origin mainure `https://` connection. Ensure you've generated the SSL certificates correctly and are accessing the server via HTTPS.
    -   Check your phone's browser settings to ensure you have granted camera permission to the site.
-   **Video is black on the laptop:**
    -   This is often a network issue. Try connecting both your phone and laptop to a different network, such as your phone's mobile hotspot.
    -   Ensure you have clicked the "Start Session" button after the stream has been received.

## 💡 Future Improvements

-   **Implement a Server-Side Inference Mode:** Add a Python-based backend using `aiortc` and `onnxruntime` to allow for a `MODE=server` option, which would be suitable for more powerful, centralized processing.
-   **Dynamic Model Loading:** Allow the user to select from different object detection models to compare performance and accuracy.
-   **Advanced Backpressure:** Implement a more sophisticated backpressure mechanism, such as a fixed-length queue for incoming frames, to provide more graceful degradation under heavy load.
