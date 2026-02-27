// streamFilter.js
import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

let faceLandmarker;
let expression = "neutral";

window.setExpression = (e) => {
    expression = e;
};

export async function createFilteredStream(originalStream) {

    const video = document.createElement("video");
    video.srcObject = originalStream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;

    await new Promise(resolve => video.onloadedmetadata = resolve);

    // Canvas that will replace video track
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    // Load MediaPipe
    const resolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(resolver, {
        baseOptions: {
            modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
        },
        runningMode: "VIDEO",
        numFaces: 1
    });

    function render() {

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const result = faceLandmarker.detectForVideo(video, performance.now());

        if (result.faceLandmarks.length > 0) {
            drawExpression(ctx, result.faceLandmarks[0], canvas);
        }

        requestAnimationFrame(render);
    }

    render();

    // Capture canvas as video stream
    const filteredStream = canvas.captureStream(30);

    // Keep original audio track
    originalStream.getAudioTracks().forEach(track => {
        filteredStream.addTrack(track);
    });

    return filteredStream;
}


function drawExpression(ctx, landmarks, canvas) {

    ctx.lineWidth = 3;

    if (expression === "happy") {
        drawSmile(ctx, landmarks, canvas, 30, "green", 8);
        drawEyes(ctx, landmarks, canvas, -20, "green", 8);
    }

    if (expression === "sad") {
        drawSmile(ctx, landmarks, canvas, -30, "blue", 8);
        drawEyebrows(ctx, landmarks, canvas, -5, -0.2, "blue", 3);
    }

    if (expression === "angry") {
        drawSmile(ctx, landmarks, canvas, -10, "red", 8);
        drawEyebrows(ctx, landmarks, canvas, -1, 0.2, "red", 3);
    }
}


function drawSmile(ctx, landmarks, canvas, curvature = 20, color = "yellow", lineWidth = 4) {

    const mouthLeft = landmarks[61];
    const mouthRight = landmarks[291];
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];

    const x1 = mouthLeft.x * canvas.width;
    const y1 = mouthLeft.y * canvas.height;
    const x2 = mouthRight.x * canvas.width;
    const y2 = mouthRight.y * canvas.height;

    const cx = (mouthLeft.x + mouthRight.x + upperLip.x + lowerLip.x) / 4 * canvas.width;
    const cy = (mouthLeft.y + mouthRight.y + upperLip.y + lowerLip.y) / 4 * canvas.height;

    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;

    const angle = Math.atan2(y2 - y1, x2 - x1);

    let cxOffset = -Math.sin(angle) * curvature;
    let cyOffset = Math.cos(angle) * curvature;

    let controlX = mx + cxOffset;
    let controlY = my + cyOffset;

    const tVertex = (y1 - controlY) / (y1 - 2 * controlY + y2);
    const yVertex =
        (1 - tVertex) * (1 - tVertex) * y1 +
        2 * (1 - tVertex) * tVertex * controlY +
        tVertex * tVertex * y2;

    const dy = cy - yVertex;

    controlY += dy;
    const y1Translated = y1 + dy;
    const y2Translated = y2 + dy;

    ctx.beginPath();
    ctx.moveTo(x1, y1Translated);
    ctx.quadraticCurveTo(controlX, controlY, x2, y2Translated);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
}

function drawEyes(ctx, landmarks, canvas, curvature = 10, color = "yellow", lineWidth = 3) {

    const eyes = [
        { left: landmarks[33], right: landmarks[133], iris: landmarks[468] },
        { left: landmarks[362], right: landmarks[263], iris: landmarks[473] }
    ];

    eyes.forEach(eye => {

        const x1 = eye.left.x * canvas.width;
        const y1 = eye.left.y * canvas.height;
        const x2 = eye.right.x * canvas.width;
        const y2 = eye.right.y * canvas.height;

        const cx = eye.iris.x * canvas.width;
        const cy = eye.iris.y * canvas.height;

        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;

        const angle = Math.atan2(y2 - y1, x2 - x1);

        const offsetX = -Math.sin(angle) * curvature;
        const offsetY = Math.cos(angle) * curvature;

        let controlX = mx + offsetX;
        let controlY = my + offsetY;

        const tVertex = (y1 - controlY) / (y1 - 2 * controlY + y2);
        const yVertex =
            (1 - tVertex) * (1 - tVertex) * y1 +
            2 * (1 - tVertex) * tVertex * controlY +
            tVertex * tVertex * y2;

        const dy = cy - yVertex;

        controlY += dy;
        const y1Translated = y1 + dy;
        const y2Translated = y2 + dy;

        ctx.beginPath();
        ctx.moveTo(x1, y1Translated);
        ctx.quadraticCurveTo(controlX, controlY, x2, y2Translated);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    });
}

function drawEyebrows(ctx, landmarks, canvas, curvature = 10, tilt = 0, color = "orange", lineWidth = 3) {

    const eyebrows = [
        { left: landmarks[55], right: landmarks[70] },
        { left: landmarks[300], right: landmarks[285] }
    ];

    eyebrows.forEach((brow, i) => {

        let x1 = brow.left.x * canvas.width;
        let y1 = brow.left.y * canvas.height;
        let x2 = brow.right.x * canvas.width;
        let y2 = brow.right.y * canvas.height;

        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;

        function rotate(x, y, cx, cy, angle) {

            const dx = x - cx;
            const dy = y - cy;

            return [
                dx * Math.cos(angle) - dy * Math.sin(angle) + cx,
                dx * Math.sin(angle) + dy * Math.cos(angle) + cy
            ];
        }

        const appliedTilt = i === 0 ? tilt : -tilt;

        [x1, y1] = rotate(x1, y1, mx, my, appliedTilt);
        [x2, y2] = rotate(x2, y2, mx, my, appliedTilt);

        const dx = x2 - x1;
        const dy = y2 - y1;

        const length = Math.sqrt(dx * dx + dy * dy);

        const perpX = -dy / length;
        const perpY = dx / length;

        const controlX = mx + perpX * curvature;
        const controlY = my + perpY * curvature;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(controlX, controlY, x2, y2);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    });
}