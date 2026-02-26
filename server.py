from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, leave_room, emit
import subprocess
import time
import requests

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Keep track of names per session
user_names = {}  # sid -> name

# Serve the main page
@app.route("/")
def index():
    return render_template("index.html")

# WebSocket signaling
@socketio.on("join")
def handle_join(data):
    room = data["room"]
    name = data["name"]
    sid = request.sid
    user_names[sid] = name  # store name for this session
    join_room(room)

    # get list of user names in the room
    users_in_room = list(user_names.values())

    # send updated user list to everyone in the room
    emit("users", {"users": users_in_room}, room=room)

    # notify others about new user
    emit("user-joined", {"name": name}, room=room, include_self=False)

@socketio.on("disconnect")
def handle_disconnect():
    sid = request.sid
    if sid in user_names:
        name = user_names[sid]
        del user_names[sid]

        # Notify other users in all rooms (or just your room if you track rooms)
        emit("user-left", {"id": sid, "name": name, "users": list(user_names.values())}, broadcast=True)

@socketio.on("signal")
def handle_signal(data):
    sid = request.sid
    name = user_names.get(sid, "Unknown")
    emit("signal", {**data, "from_name": name}, room=data["room"], include_self=False)

def start_ngrok():
    """Starts ngrok and prints the public URL"""
    ngrok_process = subprocess.Popen(["ngrok", "http", "5001"],
                                     stdout=subprocess.PIPE,
                                     stderr=subprocess.STDOUT)
    time.sleep(2)  # wait a bit for ngrok to initialize

    # Fetch the public URL
    try:
        tunnels = requests.get("http://127.0.0.1:4040/api/tunnels").json()
        public_url = tunnels['tunnels'][0]['public_url']
        print(f"Ngrok URL: {public_url}")
        return ngrok_process, public_url
    except Exception as e:
        print("Could not get ngrok URL automatically. Check ngrok terminal.")
        return ngrok_process, None

if __name__ == "__main__":
    import sys
    import os

    # Optional: allow ngrok to be disabled
    use_ngrok = True if len(sys.argv) == 1 else sys.argv[1] == "ngrok"

    if use_ngrok:
        ngrok_process, public_url = start_ngrok()
        print("Use this URL in your client script:", public_url)

    # Run Flask-SocketIO
    socketio.run(app, host="0.0.0.0", port=5001, debug=True)