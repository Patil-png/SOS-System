import { io } from 'socket.io-client';

const SOCKET_URL = 'http://192.168.29.243:5000'; // Match your server URL

class ChatService {
    socket = null;

    connect(userId) {
        this.socket = io(SOCKET_URL);

        this.socket.on('connect', () => {
            console.log('Connected to Socket Server', this.socket.id);
            this.socket.emit('join_user_room', userId);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from Socket Server');
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    sendMessage(senderId, receiverId, content, type = 'text', location = null, audioUrl = null, duration = null) {
        if (this.socket) {
            const tempId = Date.now().toString(); // Temporary ID for optimistic UI
            this.socket.emit('send_message', { senderId, receiverId, content, type, location, audioUrl, duration, tempId });
            return tempId;
        }
    }

    onReceiveMessage(callback) {
        if (this.socket) {
            this.socket.on('receive_message', (message) => {
                callback(message);
            });
            this.socket.on('live_location_updated', (data) => {
                callback(data, true); // true flag for "isUpdate"
            });
        }
    }

    sendLiveLocationUpdate(messageId, receiverId, location) {
        if (this.socket) {
            this.socket.emit('update_live_location', { messageId, receiverId, location });
        }
    }

    onMessageSent(callback) {
        if (this.socket) {
            this.socket.on('message_sent', (data) => {
                callback(data);
            });
        }
    }

    // VoIP Call Signaling
    startCall(callerId, receiverId, channelId) {
        if (this.socket) {
            this.socket.emit('call_user', { callerId, receiverId, channelId });
        }
    }

    acceptCall(callerId, receiverId, channelId) {
        if (this.socket) {
            this.socket.emit('call_accepted', { callerId, receiverId, channelId });
        }
    }

    endCall(userId, otherUserId) {
        if (this.socket) {
            this.socket.emit('call_ended', { userId, otherUserId });
        }
    }

    onIncomingCall(callback) {
        if (this.socket) {
            this.socket.on('call_incoming', callback);
        }
    }

    onCallAccepted(callback) {
        if (this.socket) {
            this.socket.on('call_accepted', callback);
        }
    }

    onCallEnded(callback) {
        if (this.socket) {
            this.socket.on('call_ended', callback);
        }
    }
}

export default new ChatService();
