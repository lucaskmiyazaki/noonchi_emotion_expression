// webrtc.js
import { container, localStream, peers, peerNames, roomName } from "./config.js";
import { socket } from "./socket.js";

export async function createPeer(id, initiator, name) {
  const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  peers[id] = pc;
  peerNames[id] = name;

  // send local tracks
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  pc.ontrack = event => {
    const name = peerNames[id] || "Unknown";
    addRemoteVideo(name, event.streams[0], id);
  };

  pc.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("signal", { room: roomName, target: id, type: "ice", candidate: event.candidate });
    }
  };

  if (initiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { room: roomName, target: id, type: "offer", offer });
  }
}

export function addRemoteVideo(name, stream, id) {
  let existingTile = container.querySelector(`.user-tile[data-id="${id}"]`);
  if (existingTile) {
    existingTile.querySelector("video").srcObject = stream;
    existingTile.querySelector(".username-label").innerText = name;
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