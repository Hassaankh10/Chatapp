# Chatapp

A real-time chat application for local networks. No accounts, no sign-up — just open it in a browser and start chatting with anyone on the same Wi-Fi or LAN. Supports private messaging, group chat, file sharing, and P2P voice/video calls.

## What it does

- Identifies users by their local IP address — no login required
- Private one-on-one messaging and a general broadcast room
- File and image sharing (up to 50MB per file)
- Voice and video calls directly between browsers using WebRTC
- Dark/light mode, mobile-responsive layout
- Message history saved in the browser across sessions

## Quickstart

The fastest way to run it is with Docker:

```bash
docker pull ghcr.io/<your-username>/chatapp:main
docker run -p 5001:5001 ghcr.io/<your-username>/chatapp:main
```

Then open `http://localhost:5001` in your browser. Share the same URL (using your machine's local IP instead of `localhost`) with anyone on the same network to start chatting.

> Note: Voice and video calls require HTTPS. See the SSL section below if you need camera/mic access.

## Running from source

**Requirements:** Python 3.12+

```bash
git clone <repo-url>
cd Chatapp
python -m venv .env
source .env/bin/activate       # Windows: .env\Scripts\activate
pip install -r requirements.txt
python app.py
```

The app will be available at `http://localhost:5001`.

## Enabling voice and video calls (HTTPS)

WebRTC requires a secure context for camera and microphone access. Generate a self-signed certificate and place it in the project root:

```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"
```

Restart the app — it will automatically detect the certificates and serve over HTTPS. When other devices on your network connect, they will need to accept the browser's security warning for the self-signed cert before calls will work.

## Docker options

Persist uploaded files across container restarts:

```bash
docker run -p 5001:5001 -v $(pwd)/uploads:/app/uploads ghcr.io/<your-username>/chatapp:main
```

Set a custom secret key (recommended for any non-local deployment):

```bash
docker run -p 5001:5001 -e SECRET_KEY=your-secret-here ghcr.io/<your-username>/chatapp:main
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | `secret!` | Flask session secret — override this in production |

## Tech stack

- **Backend:** Python, Flask, Flask-SocketIO
- **Server:** Gunicorn with gevent WebSocket worker
- **Real-time:** Socket.IO
- **Calls:** WebRTC (peer-to-peer, server only handles signaling)
- **Frontend:** Vanilla HTML, CSS, JavaScript — no framework

## Important notes

- This app is designed for **trusted local networks**. Users are identified only by IP address with no authentication.
- Uploaded files are stored on the server's disk. Use the volume mount above to keep them between restarts.
- WebRTC calls go directly between browsers — the server is not involved in the media stream.





