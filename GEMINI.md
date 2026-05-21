# Local Network Chat & WebRTC Calling App

A comprehensive, real-time communication application designed for use within a local area network (LAN). This app facilitates instant messaging, file sharing, and high-quality P2P voice/video calls using WebRTC.

## Project Overview

- **Purpose:** Provide a seamless, serverless-feeling communication tool for local networks without requiring external internet for the core messaging/calling logic.
- **Tech Stack:**
    - **Backend:** Python, Flask, Flask-SocketIO.
    - **Frontend:** Vanilla HTML5, CSS3 (Custom Properties for Theming), JavaScript (ES6+).
    - **Real-time Engine:** Socket.IO (for signaling and messaging).
    - **Media Communication:** WebRTC (for P2P Voice and Video).
    - **Icons:** Lucide Icons.
- **Key Features:**
    - **IP-Based Chat Rooms:** Users are identified by their local IP addresses.
    - **Private Messaging:** Direct P2P messaging using IP-based routing.
    - **General Chat:** A global broadcast room for all connected local users.
    - **File & Image Sharing:** Support for attachments with local storage and unique file naming.
    - **WebRTC Voice/Video Calls:** Direct P2P media streams with full call controls (Mute, Camera toggle, Hangup).
    - **Session Persistence:** Message history and theme preferences stored in `localStorage`.
    - **Responsive Design:** Mobile-first, iMessage-inspired UI that adapts from desktop to mobile.
    - **Dark/Light Mode:** Full theming support with automatic system preference detection.
    - **HTTPS Security:** Self-signed certificate integration to enable browser camera/mic permissions.

## Architecture & Directory Structure

- `app.py`: The main Flask server. Handles Socket.IO events for messaging and WebRTC signaling (offers, answers, ICE candidates).
- `templates/index.html`: The core application structure.
- `static/css/style.css`: Comprehensive styling including mobile responsiveness and theme variables.
- `static/js/script.js`: Client-side application logic, WebRTC implementation, and UI state management.
- `cert.pem` / `key.pem`: SSL certificates for secure HTTPS serving.
- `uploads/`: Directory for storing shared files and images.

## Building and Running

### Prerequisites
- Python 3.14+
- `flask`, `flask-socketio`, `eventlet` (recommended for production-like performance) or `gevent-websocket`.

### Key Commands
- **Install Dependencies (assuming venv exists):**
  ```bash
  pip install flask flask-socketio eventlet
  ```
- **Run the Application:**
  ```bash
  python app.py
  ```
- **Accessing the App:**
  - Open `https://localhost:5001` or `https://<your-local-ip>:5001` in your browser.
  - Since the certificate is self-signed, click **Advanced** -> **Proceed** on the browser security warning page.

## Development Conventions

- **Messaging:** All messages are routed via Socket.IO using `target_ip`. If `target_ip` is null or 'broadcast', it goes to the general chat.
- **Calling:** WebRTC uses the `target_ip` as a room name to exchange signaling data between two specific peers.
- **UI State:**
    - `.light-mode` / `.dark-mode` classes on `<body>` control the theme.
    - `.show-chat` class on `<body>` toggles the mobile view between the sidebar and the active chat.
- **File Uploads:** Files are saved with a `uuid_filename` format in the `uploads` directory to prevent collisions across multiple users sharing files with the same name.
- **Deduplication:** The client-side logic performs simple deduplication on incoming messages using a combination of `timestamp` and `content`.

## Future Roadmap (TODOs)
- [ ] Implement permanent database storage (e.g., SQLite) for server-side persistence.
- [ ] Add user presence indicators (Typing...).
- [ ] Implement end-to-end encryption for private messages.
- [ ] Add support for group chats beyond the General room.
