const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
    victimId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, default: 'SOS' }, // SOS, FALL, DRIFT
    audioUrl: { type: String }, // Path to uploaded file
    location: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String }
    },
    timestamp: { type: Date, default: Date.now },
    status: { type: String, enum: ['ACTIVE', 'RESOLVED'], default: 'ACTIVE' }
});

module.exports = mongoose.model('Incident', IncidentSchema);
