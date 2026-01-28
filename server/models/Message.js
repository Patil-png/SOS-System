const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String, // Encrypted content or "Shared Location" text
        required: true
    },
    type: {
        type: String,
        enum: ['text', 'location', 'image', 'audio'],
        default: 'text'
    },
    location: {
        latitude: Number,
        longitude: Number
    },
    audioUrl: {
        type: String // URL to audio file for audio messages
    },
    duration: {
        type: Number // Duration in seconds for audio messages
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    isRead: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Message', MessageSchema);
