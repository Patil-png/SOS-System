const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const GuardianSchema = new mongoose.Schema({
    name: { type: String, set: encrypt, get: decrypt },
    phone: { type: String, set: encrypt, get: decrypt },
    phoneHash: { type: String, required: true }, // Searchable Hash for reverse-linking
    fcmToken: String,
});

// Enable getters when converting to JSON/Object
GuardianSchema.set('toJSON', { getters: true });
GuardianSchema.set('toObject', { getters: true });

const UserSchema = new mongoose.Schema({
    name: { type: String, set: encrypt, get: decrypt },
    phone: { type: String, set: encrypt, get: decrypt },
    phoneHash: { type: String, required: true, index: true }, // Searchable Hash
    guardians: [GuardianSchema], // Legacy simple list for SMS

    // New Relationships for App-to-App features
    trustedGuardians: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    monitoredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

UserSchema.set('toJSON', { getters: true });
UserSchema.set('toObject', { getters: true });

module.exports = mongoose.model('User', UserSchema);
