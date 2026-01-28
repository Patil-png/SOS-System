const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
// Ensure ENCRYPTION_KEY is 32 bytes (256 bits). 
// For demo, we might fall back or throw error if not set.
const KEY = process.env.ENCRYPTION_KEY
    ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
    : crypto.randomBytes(32); // Fallback for dev (WARNING: Data lost on restart)

// Log warning if fallback is used
if (!process.env.ENCRYPTION_KEY) {
    console.warn("WARNING: Using random ENCRYPTION_KEY. Data will be unreadable after restart. Set ENCRYPTION_KEY in .env");
}

const encrypt = (text) => {
    if (!text) return text;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Return IV:EncryptedText
    return `${iv.toString('hex')}:${encrypted}`;
};

const decrypt = (text) => {
    if (!text) return text;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = textParts.join(':');
        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error("Decryption failed:", error.message);
        return null; // Or throw
    }
};

module.exports = { encrypt, decrypt };
