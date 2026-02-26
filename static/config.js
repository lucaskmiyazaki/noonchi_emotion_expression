// config.js
export const urlParams = new URLSearchParams(window.location.search);
export const roomName = urlParams.get("room") || "default";
export const userName = urlParams.get("user") || "Anonymous";

export const container = document.getElementById("container");
export const cameraButton = document.getElementById("cameraButton");

export let localStream = null;

export function setLocalStream(stream) {
  localStream = stream;
}
export const peers = {};
export const peerNames = {};