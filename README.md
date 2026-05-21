# Chatapp

A real-time LAN chat application with file sharing and P2P voice/video calling. Built with Flask and Socket.IO on the backend, WebRTC for media streams, and a responsive vanilla JS frontend.

## Features

- IP-based user identification — no accounts or sign-up required
- Private messaging between users on the same network
- General broadcast chat room
- File and image sharing (up to 50MB)
- P2P voice and video calls via WebRTC
- Dark/light mode with system preference detection
- Message history persisted in localStorage
- HTTPS support for camera/microphone browser permissions

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, Flask, Flask-SocketIO |
| Async server | Gunicorn + gevent WebSocket worker |
| Real-time | Socket.IO |
| Media | WebRTC |
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES6+) |

## Project Structure

```
chatapp/
├── app.py               # Flask server, Socket.IO events, WebRTC signaling
├── templates/
│   └── index.html       # Application shell
├── static/
│   ├── css/style.css    # Theming and responsive layout
│   └── js/script.js     # Client logic, WebRTC, UI state
├── uploads/             # Uploaded files (gitignored, persisted at runtime)
├── Dockerfile
├── requirements.txt
└── .github/
    └── workflows/
        └── docker-publish.yml
```

## Running Locally

### Prerequisites

- Python 3.12+
- pip

### Setup

```bash
python -m venv .env
source .env/bin/activate
pip install -r requirements.txt
```

### Run

```bash
python app.py
```

The app starts on `https://localhost:5001` if `cert.pem` and `key.pem` are present, otherwise plain HTTP on port 5001.

To generate a self-signed certificate for local HTTPS (required for camera/mic access):

```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"
```

Open `https://<your-local-ip>:5001` on any device on the same network. Accept the browser's self-signed certificate warning to proceed.

## Running with Docker

```bash
docker pull ghcr.io/hassaankh10/chatapp:main
docker run -p 5001:5001 ghcr.io/hassaankh10/chatapp:main
```

To persist uploaded files across container restarts:

```bash
docker run -p 5001:5001 -v $(pwd)/uploads:/app/uploads ghcr.io/hassaankh10/chatapp:main
```

To set a custom secret key:

```bash
docker run -p 5001:5001 -e SECRET_KEY=your-secret ghcr.io/hassaankh10/chatapp:main
```

## CI/CD

The GitHub Actions workflow at `.github/workflows/docker-publish.yml` automatically builds and pushes a multi-platform image (`linux/amd64`, `linux/arm64`) to GitHub Container Registry on every push to `main`.

Images are tagged with the branch name and a short commit SHA:

```
ghcr.io/hassaankh10/chatapp:main
ghcr.io/hassaankh10/chatapp:sha-<commit>
```

Versioned releases are triggered by pushing a tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This produces additional tags `v1.0.0` and `v1.0`.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | `secret!` | Flask session secret — change in production |

## Notes

- The app uses IP addresses as user identifiers, so it is intended for trusted local networks only.
- WebRTC calls are peer-to-peer; the server only exchanges signaling data.
- Uploaded files are stored on disk in the `uploads/` directory with UUID-prefixed names to avoid collisions.
