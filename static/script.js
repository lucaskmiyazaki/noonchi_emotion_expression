// ==================
// Get room and user from URL
// ==================
const urlParams = new URLSearchParams(window.location.search);
const roomName = urlParams.get("room") || "default";
const userName = urlParams.get("user") || "Anonymous";

document.getElementById("roomName").innerText = "Room: " + roomName;

const container = document.getElementById("container");
const cameraButton = document.getElementById("cameraButton");

// ==================
// Variables
// ==================
let localStream = null;
const peers = {};       // peerId -> RTCPeerConnection
const peerNames = {};   // peerId -> username mapping

// ==================
// Socket.IO connection
// ==================
const socket = io("https://compatible-jenniffer-unpaced.ngrok-free.dev/");

// When a new user joins
socket.on("user-joined", async data => {
  await createPeer(data.id, true, data.name); // pass the name here
});

// When a user leaves
socket.on("user-left", data => {
  const id = data.id;

  // Close peer connection
  if (peers[id]) {
    peers[id].close();
    delete peers[id];
  }

  // Remove name mapping
  delete peerNames[id];

  // Remove video tile
  const tile = container.querySelector(`.user-tile[data-id="${id}"]`);
  if (tile) tile.remove();
});

// ==================
// Signal handler
// ==================
socket.on("signal", async data => {
  const id = data.from;
  const name = data.from_name; // get the sender's name from the signal
  if (!peers[id]) {
    await createPeer(id, false, name); // pass it when creating the peer
  }
  peerNames[id] = name; // store immediately
  const pc = peers[id];

  if (data.type === "offer") {
    await pc.setRemoteDescription(data.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("signal", { room: roomName, target: id, type: "answer", answer });
  } else if (data.type === "answer") {
    await pc.setRemoteDescription(data.answer);
  } else if (data.type === "ice") {
    await pc.addIceCandidate(data.candidate);
  }
});

// ==================
// Create local video tile
// ==================
const localTile = document.createElement("div");
localTile.className = "user-tile";
localTile.setAttribute("data-id", "local");

const localVideoEl = document.createElement("video");
localVideoEl.autoplay = true;
localVideoEl.playsInline = true;
localTile.appendChild(localVideoEl);

const localLabel = document.createElement("div");
localLabel.className = "username-label";
localLabel.innerText = userName;
localTile.appendChild(localLabel);

container.appendChild(localTile);

// ==================
// Start local camera
// ==================
async function startCamera() {
  if (localStream) return localStream;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoEl.srcObject = localStream;
    localVideoEl.onloadedmetadata = () => localVideoEl.play();
    return localStream;
  } catch (err) {
    console.error("Camera error:", err);
  }
}

// ==================
// Initialize
// ==================
async function init() {
  await startCamera();
  socket.emit("join", { room: roomName, name: userName });
}
init();

// ==================
// Camera toggle
// ==================
cameraButton.addEventListener("click", () => {
  if (!localStream) return;
  const videoTrack = localStream.getVideoTracks()[0];
  videoTrack.enabled = !videoTrack.enabled;
  cameraButton.innerText = videoTrack.enabled ? "Turn Camera Off" : "Turn Camera On";
});

// ==================
// WebRTC functions
// ==================
async function createPeer(id, initiator, name) {
  const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  peers[id] = pc;
  peerNames[id] = name; // make sure we store it immediately

  // Send local tracks
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  // Receive remote video
  pc.ontrack = event => {
    const name = peerNames[id] || "Unknown";
    addRemoteVideo(name, event.streams[0], id);
  };

  // ICE candidates
  pc.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("signal", { room: roomName, target: id, type: "ice", candidate: event.candidate });
    }
  };

  // Initiator creates offer
  if (initiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { room: roomName, target: id, type: "offer", offer });
  }
}

// ==================
// Add remote video tile
// ==================
function addRemoteVideo(name, stream, id) {
  // Avoid duplicate tiles
  let existingTile = container.querySelector(`.user-tile[data-id="${id}"]`);
  if (existingTile) {
    existingTile.querySelector("video").srcObject = stream;
    existingTile.querySelector(".username-label").innerText = name; // update name dynamically
    return;
  }

  const tile = document.createElement("div");
  tile.className = "user-tile";
  tile.setAttribute("data-id", id);

  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.srcObject = stream;

  const label = document.createElement("div");
  label.className = "username-label";
  label.innerText = name;

  tile.appendChild(video);
  tile.appendChild(label);
  container.appendChild(tile);
}