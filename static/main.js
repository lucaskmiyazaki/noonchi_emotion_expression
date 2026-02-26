// main.js
import { container, cameraButton, localStream, setLocalStream, roomName, userName } from "./config.js";
import { socket } from "./socket.js";
import { createPeer } from "./webrtc.js";

// Local video tile
const localTile = document.createElement("div");
localTile.className = "user-tile";
localTile.setAttribute("data-id", "local");

const localVideoEl = document.createElement("video");
localVideoEl.autoplay = true;
localVideoEl.playsInline = true;
localVideoEl.muted = true; 
localTile.appendChild(localVideoEl);

const localLabel = document.createElement("div");
localLabel.className = "username-label";
localLabel.innerText = userName;
localTile.appendChild(localLabel);

container.appendChild(localTile);

// Start camera
async function startCamera() {
  if (localStream) return localStream;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);  // ✅ update the exported variable
    localVideoEl.srcObject = stream;
    localVideoEl.onloadedmetadata = () => localVideoEl.play();
    return stream;
  } catch (err) {
    console.error("Camera error:", err);
  }
}

// Initialize
async function init() {
  await startCamera();
  socket.emit("join", { room: roomName, name: userName });
}
init();

// Camera toggle
cameraButton.addEventListener("click", () => {
  if (!localStream) return;
  const videoTrack = localStream.getVideoTracks()[0];
  videoTrack.enabled = !videoTrack.enabled;
  cameraButton.innerText = videoTrack.enabled ? "Turn Camera Off" : "Turn Camera On";
});