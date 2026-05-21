import os
import uuid
from flask import Flask, render_template, request, send_from_directory, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'secret!')
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='gevent')

# Track connected IPs and their counts (to know when an IP is truly offline)
connected_ips = {} # { ip: connection_count }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file:
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        return jsonify({
            'filename': filename,
            'url': f'/uploads/{unique_filename}',
            'is_image': file.content_type.startswith('image/'),
            'content_type': file.content_type
        })

@socketio.on('connect')
def handle_connect():
    ip = request.remote_addr
    join_room(ip)
    connected_ips[ip] = connected_ips.get(ip, 0) + 1
    # Tell the client what their IP is
    emit('identity', ip)
    # Broadcast unique IPs only
    emit('user_list', list(connected_ips.keys()), broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    ip = request.remote_addr
    if ip in connected_ips:
        connected_ips[ip] -= 1
        if connected_ips[ip] <= 0:
            del connected_ips[ip]
    emit('user_list', list(connected_ips.keys()), broadcast=True)

@socketio.on('message')
def handle_message(data):
    sender_ip = request.remote_addr
    target_ip = data.get('target_ip')
    data['sender_ip'] = sender_ip
    
    if target_ip and target_ip != 'broadcast':
        emit('message', data, room=target_ip)
        if target_ip != sender_ip:
            emit('message', data, room=sender_ip)
    else:
        emit('message', data, broadcast=True)

# WebRTC Signaling
@socketio.on('call-user')
def handle_call_user(data):
    # data: { target_ip, offer, type: 'video'|'voice' }
    data['sender_ip'] = request.remote_addr
    emit('call-made', data, room=data['target_ip'])

@socketio.on('make-answer')
def handle_make_answer(data):
    # data: { target_ip, answer }
    data['sender_ip'] = request.remote_addr
    emit('answer-made', data, room=data['target_ip'])

@socketio.on('ice-candidate')
def handle_ice_candidate(data):
    # data: { target_ip, candidate }
    data['sender_ip'] = request.remote_addr
    emit('ice-candidate', data, room=data['target_ip'])

@socketio.on('hangup')
def handle_hangup(data):
    data['sender_ip'] = request.remote_addr
    emit('hangup', data, room=data['target_ip'])

if __name__ == '__main__':
    ssl_ctx = None
    if os.path.exists('cert.pem') and os.path.exists('key.pem'):
        import ssl
        ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_ctx.load_cert_chain('cert.pem', 'key.pem')
    socketio.run(app, host='0.0.0.0', port=5001, debug=True, ssl_context=ssl_ctx)
