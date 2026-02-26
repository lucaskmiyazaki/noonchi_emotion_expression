// socket.js
import { roomName, peers, peerNames } from "./config.js";
import { createPeer } from "./webrtc.js";

export const socket = io("https://compatible-jenniffer-unpaced.ngrok-free.dev/");

socket.on("user-joined", async data => {
  await createPeer(data.id, true, data.name);
});

socket.on("user-left", data => {
  const id = data.id;
  if (peers[id]) {
    peers[id].close();
    delete peers[id];
  }
  delete peerNames[id];
  const tile = document.querySelector(`.user-tile[data-id="${id}"]`);
  if (tile) tile.remove();
});

socket.on("signal", async data => {
  const id = data.from;
  const name = data.from_name;
  if (!peers[id]) await createPeer(id, false, name);
  peerNames[id] = name;

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