const socket = io();
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const fileInput = document.getElementById('file-upload');
const userListDiv = document.getElementById('user-list');
const headerName = document.getElementById('header-name');
const headerAvatar = document.getElementById('header-avatar');

let currentTargetIp = 'broadcast';
let myIp = null;

// Load chat history from localStorage
let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || {
    'broadcast': []
};

function saveHistory() {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

function appendMessage(msg, room) {
    if (room !== currentTargetIp) return;

    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(msg.isMe ? 'sent' : 'received');

    if (msg.type === 'text') {
        messageElement.textContent = msg.content;
    } else if (msg.type === 'file') {
        const container = document.createElement('div');
        container.classList.add('message-file');
        if (msg.isImage) {
            const img = document.createElement('img');
            img.src = msg.url;
            img.classList.add('message-image');
            img.onclick = () => window.open(msg.url, '_blank');
            container.appendChild(img);
        } else {
            const link = document.createElement('a');
            link.href = msg.url;
            link.target = '_blank';
            link.classList.add('file-link');
            link.textContent = `📎 ${msg.filename}`;
            container.appendChild(link);
        }
        messageElement.appendChild(container);
    }

    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function switchChat(ip, name) {
    currentTargetIp = ip;
    headerName.textContent = name;
    headerAvatar.textContent = name[0].toUpperCase();
    
    document.querySelectorAll('.user-item').forEach(el => {
        el.classList.toggle('active', el.dataset.ip === ip);
    });

    messagesDiv.innerHTML = '';
    const history = chatHistory[ip] || [];
    history.forEach(msg => appendMessage(msg, ip));

    if (window.innerWidth <= 768) {
        document.body.classList.add('show-chat');
    }
}

function sendMessage() {
    const text = messageInput.value.trim();
    if (text) {
        const messageData = {
            type: 'text',
            content: text,
            target_ip: currentTargetIp,
            timestamp: new Date().toISOString()
        };
        socket.emit('message', messageData);
        messageInput.value = '';
    }
}

socket.on('connect', () => {
    // We get our IP implicitly from the first message or a dedicated event
    // But for now, we'll wait for user_list to identify others
});

let allIps = [];

socket.on('user_list', (ips) => {
    allIps = ips;
    refreshUserList();
});

socket.on('identity', (ip) => {
    myIp = ip;
    refreshUserList();
});

// Theme Management
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

function applyTheme(theme) {
    document.body.className = theme + '-mode';
    themeIcon.setAttribute('data-lucide', theme === 'light' ? 'moon' : 'sun');
    localStorage.setItem('theme', theme);
    if (window.lucide) lucide.createIcons();
}

// Auto-detect system theme
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
let currentTheme = localStorage.getItem('theme') || systemTheme;

themeToggle.onclick = () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(currentTheme);
};

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
    }
});

applyTheme(currentTheme);

// WebRTC State
let peerConnection;
let localStream;
let remoteStream;
let callType = 'video'; // 'video' or 'voice'
let activeCallTarget = null;

const configuration = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] };

// UI Elements for Calling
const callOverlay = document.getElementById('call-overlay');
const incomingCallModal = document.getElementById('incoming-call-modal');
const confirmCallModal = document.getElementById('confirm-call-modal');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');

async function promptStartCall(targetIp, type) {
    if (targetIp === 'broadcast') return alert('Cannot call General Chat');
    
    activeCallTarget = targetIp;
    callType = type;
    
    // Update confirm modal text
    document.querySelector('.confirm-text').textContent = `Start a ${type} call with ${targetIp}?`;
    confirmCallModal.classList.remove('hidden');

    document.getElementById('confirm-start-call').onclick = () => {
        confirmCallModal.classList.add('hidden');
        startCall(targetIp, type);
    };

    document.getElementById('cancel-start-call').onclick = () => {
        confirmCallModal.classList.add('hidden');
    };
}

async function startCall(targetIp, type) {
    // Check for Secure Context (Required by browsers for Camera/Mic)
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        alert('Browsers require a secure connection for camera/mic access.\n\nPlease ensure you clicked "Advanced" -> "Proceed" on the warning page.');
        return;
    }

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: type === 'video', 
            audio: true 
        });
        localVideo.srcObject = localStream;
        callOverlay.classList.remove('hidden');
        
        peerConnection = new RTCPeerConnection(configuration);
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('ice-candidate', { target_ip: targetIp, candidate: event.candidate });
            }
        };
        
        peerConnection.ontrack = event => {
            remoteVideo.srcObject = event.streams[0];
        };
        
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        socket.emit('call-user', { target_ip: targetIp, offer: offer, type: type });
    } catch (err) {
        console.error('Error starting call:', err);
        alert('Could not access camera/microphone. Please ensure you have granted permission.');
    }
}

socket.on('call-made', async (data) => {
    incomingCallModal.classList.remove('hidden');
    document.querySelector('#incoming-call-modal .caller-name').textContent = `Incoming ${data.type} call from ${data.sender_ip}`;
    
    document.getElementById('accept-call').onclick = async () => {
        incomingCallModal.classList.add('hidden');
        callOverlay.classList.remove('hidden');
        activeCallTarget = data.sender_ip;
        callType = data.type;
        
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ 
                video: data.type === 'video', 
                audio: true 
            });
            localVideo.srcObject = localStream;
            
            peerConnection = new RTCPeerConnection(configuration);
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
            
            peerConnection.onicecandidate = event => {
                if (event.candidate) {
                    socket.emit('ice-candidate', { target_ip: data.sender_ip, candidate: event.candidate });
                }
            };
            
            peerConnection.ontrack = event => {
                remoteVideo.srcObject = event.streams[0];
            };
            
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            socket.emit('make-answer', { target_ip: data.sender_ip, answer: answer });
        } catch (err) {
            console.error('Error accepting call:', err);
            alert('Could not access camera/microphone.');
        }
    };
    
    document.getElementById('reject-call').onclick = () => {
        incomingCallModal.classList.add('hidden');
        socket.emit('hangup', { target_ip: data.sender_ip });
    };
});

socket.on('answer-made', async (data) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

socket.on('ice-candidate', async (data) => {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (e) {
        console.error('Error adding ice candidate', e);
    }
});

socket.on('hangup', () => {
    endCall();
});

function endCall() {
    if (peerConnection) peerConnection.close();
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    callOverlay.classList.add('hidden');
    incomingCallModal.classList.add('hidden');
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
}

document.getElementById('hangup-btn').onclick = () => {
    socket.emit('hangup', { target_ip: activeCallTarget });
    endCall();
};

document.getElementById('voice-call-btn').onclick = () => promptStartCall(currentTargetIp, 'voice');
document.getElementById('video-call-btn').onclick = () => promptStartCall(currentTargetIp, 'video');

// Toggle Mic/Camera
document.getElementById('toggle-mic').onclick = () => {
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    const btn = document.getElementById('toggle-mic');
    btn.classList.toggle('btn-off', !audioTrack.enabled);
    btn.querySelector('i').setAttribute('data-lucide', audioTrack.enabled ? 'mic' : 'mic-off');
    lucide.createIcons();
};

document.getElementById('toggle-camera').onclick = () => {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const btn = document.getElementById('toggle-camera');
        btn.classList.toggle('btn-off', !videoTrack.enabled);
        btn.querySelector('i').setAttribute('data-lucide', videoTrack.enabled ? 'video' : 'video-off');
        lucide.createIcons();
    }
};

function refreshUserList() {
    userListDiv.innerHTML = `
        <div class="user-item ${currentTargetIp === 'broadcast' ? 'active' : ''}" data-ip="broadcast" onclick="switchChat('broadcast', 'General Chat')">
            <div class="user-avatar"><i data-lucide="users"></i></div>
            <div class="user-details">
                <div class="user-name">General Chat</div>
                <div class="user-status">Public Room</div>
            </div>
        </div>
    `;

    allIps.forEach(ip => {
        if (ip === myIp) return;

        const userItem = document.createElement('div');
        userItem.className = `user-item ${currentTargetIp === ip ? 'active' : ''}`;
        userItem.dataset.ip = ip;
        userItem.onclick = () => switchChat(ip, ip);
        userItem.innerHTML = `
            <div class="user-avatar"><i data-lucide="smartphone"></i></div>
            <div class="user-details">
                <div class="user-name">${ip}</div>
                <div class="user-status">Other Device</div>
            </div>
        `;
        userListDiv.appendChild(userItem);
    });
    
    if (window.lucide) lucide.createIcons();
}

// Update app.py to send identity
// For now, let's just use the sender_ip of the first broadcast message to guess myIp
// Or even better, server sends it on connect.

socket.on('message', (data) => {
    const isMe = (data.sender_ip === myIp);
    let room = 'broadcast';

    if (data.target_ip && data.target_ip !== 'broadcast') {
        // Private message routing
        if (isMe) {
            room = data.target_ip;
        } else {
            room = data.sender_ip;
        }
    }

    const msgToStore = { ...data, isMe: isMe };
    if (!chatHistory[room]) chatHistory[room] = [];
    
    // Prevent duplicate messages being stored
    const isDuplicate = chatHistory[room].some(m => m.timestamp === data.timestamp && m.content === data.content);
    if (!isDuplicate) {
        chatHistory[room].push(msgToStore);
        saveHistory();
    }

    appendMessage(msgToStore, room);
});

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
        const response = await fetch('/upload', { method: 'POST', body: formData });
        if (response.ok) {
            const result = await response.json();
            socket.emit('message', {
                type: 'file',
                target_ip: currentTargetIp,
                filename: result.filename,
                url: result.url,
                isImage: result.is_image,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) { console.error(error); }
    fileInput.value = '';
});

document.getElementById('back-btn').onclick = () => {
    document.body.classList.remove('show-chat');
};

messageInput.focus();
