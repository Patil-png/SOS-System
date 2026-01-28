require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto'); // Built-in node module

// Helper to sanitize phone (remove spaces, dashes, etc.)
const sanitizePhone = (phone) => String(phone).replace(/\D/g, '');

// Helper to hash phone numbers for searching
const hashPhone = (phone) => {
    const cleanPhone = sanitizePhone(phone);
    return crypto.createHash('sha256').update(cleanPhone).digest('hex');
};


const User = require('./models/User');
const Incident = require('./models/Incident');
const ConnectionRequest = require('./models/ConnectionRequest');
const { validateEmergency, validateUser } = require('./middleware/validation');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads dir exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // unique name
    }
});
const upload = multer({ storage });

// Security Middleware
app.use(helmet());
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Middleware
app.use(cors()); // Crucial for mobile app access
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve file access

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sos-app')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// --- Socket.io Setup ---
const http = require('http');
const { Server } = require('socket.io');
const Message = require('./models/Message');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for dev
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // Join a room based on User ID to receive private messages
    socket.on('join_user_room', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined their private room`);
    });

    // Send Message Event
    socket.on('send_message', async (data) => {
        // data: { senderId, receiverId, content, type, location, audioUrl, duration, tempId }
        const { senderId, receiverId, content, type = 'text', location, audioUrl, duration } = data;

        // 1. Save to DB
        try {
            const newMessage = new Message({
                sender: senderId,
                receiver: receiverId,
                content: content,
                type: type,
                location: location,
                audioUrl: audioUrl,
                duration: duration
            });
            await newMessage.save();

            // 2. Emit to Receiver
            io.to(receiverId).emit('receive_message', newMessage);

            // 3. Emit back to sender
            io.to(senderId).emit('message_sent', { tempId: data.tempId, message: newMessage });

        } catch (err) {
            console.error('Error saving message:', err);
        }
    });

    // Live Location Update
    socket.on('update_live_location', async (data) => {
        // data: { messageId, location, receiverId }

        // 1. Emit to Receiver
        io.to(data.receiverId).emit('live_location_updated', {
            messageId: data.messageId,
            location: data.location,
            senderId: data.receiverId // Effectively from the perspective of the other? No.
        });

        // 2. Emit back to Sender (Self-Reflection for LiveTrackingScreen)
        socket.emit('live_location_updated', {
            messageId: data.messageId,
            location: data.location
        });

        // Optionally update DB (skip for high freq, or update last known)
        try {
            await Message.updateOne(
                { _id: data.messageId },
                { $set: { location: data.location } }
            );
        } catch (e) { console.error(e); }
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
    });
});


// Firebase Setup (Placeholder)
// admin.initializeApp({ ... });

// Routes
app.get('/', (req, res) => {
    res.send('SOS Backend Running');
});

// Audio Upload Endpoint
app.post('/api/upload-audio', upload.single('audio'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }

        const audioUrl = `http://192.168.29.243:5000/uploads/${req.file.filename}`;
        const duration = req.body.duration || 0; // Duration in seconds from client

        res.json({
            success: true,
            audioUrl,
            duration: parseFloat(duration)
        });
    } catch (error) {
        console.error('Audio upload error:', error);
        res.status(500).json({ error: 'Failed to upload audio' });
    }
});

// Register User Endpoint
app.post('/register', validateUser, async (req, res) => {
    const { name, phone, guardianName, guardianPhone } = req.body;

    try {
        // Hash the phones for searching/indexing
        const userPhoneHash = hashPhone(phone);
        const guardianPhoneHash = hashPhone(guardianPhone);

        // 1. Create the new User (The Child/Victim)
        const newUser = new User({
            name,
            phone,
            phoneHash: userPhoneHash,
            guardians: [{
                name: guardianName,
                phone: guardianPhone,
                phoneHash: guardianPhoneHash
            }]
        });

        // 2. Check if the Guardian already exists in our app (Search by Hash)
        const existingGuardian = await User.findOne({ phoneHash: guardianPhoneHash });

        if (existingGuardian) {
            console.log(`Found existing guardian: ${existingGuardian.name}`);

            // NEW FLOW: Create a Connection Request instead of auto-linking
            const newRequest = new ConnectionRequest({
                requesterId: newUser._id,
                recipientId: existingGuardian._id,
                status: 'pending'
            });
            await newRequest.save();
            console.log(`Connection Request created for ${existingGuardian.name}`);

        } else {
            console.log(`Guardian ${guardianPhone} not registered yet. Request pending future registration.`);
        }

        // 3. Also check if *this new user* was listed as a guardian by someone else previously
        // (Reverse linking if Guardian registers AFTER Child)
        const wardsWaitinForMe = await User.find({ "guardians.phoneHash": userPhoneHash });
        for (const ward of wardsWaitinForMe) {
            // Create a request FROM the ward TO the new guardian
            const reverseRequest = new ConnectionRequest({
                requesterId: ward._id,
                recipientId: newUser._id,
                status: 'pending'
            });
            await reverseRequest.save();
            console.log(`Backlogged request created from ward ${ward.name}`);
        }

        await newUser.save();

        res.status(201).json({
            success: true,
            userId: newUser._id,
            name: newUser.name,
            message: 'User registered & linked successfully'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login Endpoint
app.post('/login', async (req, res) => {
    const { phone } = req.body;

    const phoneHash = hashPhone(phone);

    try {
        const user = await User.findOne({ phoneHash }); // Search by Hash
        if (!user) {
            return res.status(404).json({ error: 'User not found. Please register first.' });
        }
        res.json({
            success: true,
            userId: user._id,
            name: user.name,
            message: 'Login successful'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Get User Details (for syncing contacts)
app.get('/api/user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate('trustedGuardians', 'name phone')
            .populate('monitoredUsers', 'name phone');

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            success: true,
            user: {
                name: user.name,
                phone: user.phone,
                trustedGuardians: user.trustedGuardians,
                monitoredUsers: user.monitoredUsers
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// --- Connection Request Endpoints ---

// Get Pending Requests for a User (Guardian)
app.get('/api/requests/pending/:userId', async (req, res) => {
    try {
        console.log(`Fetching pending requests for ${req.params.userId}`);
        const requests = await ConnectionRequest.find({
            recipientId: req.params.userId,
            status: 'pending'
        }).populate('requesterId', 'name phone');

        console.log(`Found ${requests.length} requests`);
        res.json({ success: true, requests });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

// Create a Request Manually
app.post('/api/requests/create', async (req, res) => {
    const { requesterId, guardianPhone } = req.body;

    try {
        const guardianPhoneHash = hashPhone(guardianPhone);
        const guardian = await User.findOne({ phoneHash: guardianPhoneHash });

        if (!guardian) {
            return res.status(404).json({ error: 'User not registered with this phone.' });
        }

        if (guardian._id.toString() === requesterId) {
            return res.status(400).json({ error: 'You cannot add yourself.' });
        }

        // Check if already connected
        if (guardian.monitoredUsers.includes(requesterId)) {
            return res.status(400).json({ error: 'Already connected to this guardian.' });
        }

        // Check if pending request exists
        const existingRequest = await ConnectionRequest.findOne({
            requesterId,
            recipientId: guardian._id,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ error: 'Request already pending.' });
        }

        const newRequest = new ConnectionRequest({
            requesterId,
            recipientId: guardian._id,
            status: 'pending'
        });
        await newRequest.save();

        res.json({ success: true, message: 'Request sent successfully' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create request' });
    }
});

// Respond to Request (Accept/Reject)
app.post('/api/requests/respond', async (req, res) => {
    const { requestId, status } = req.body; // status: 'accepted' | 'rejected'

    try {
        const request = await ConnectionRequest.findById(requestId);
        if (!request) return res.status(404).json({ error: 'Request not found' });

        request.status = status;
        await request.save();

        if (status === 'accepted') {
            // Establish Link
            const child = await User.findById(request.requesterId);
            const guardian = await User.findById(request.recipientId);

            if (child && guardian) {
                // Add Guardian to Child's trusted list (no duplicates)
                if (!child.trustedGuardians.includes(guardian._id)) {
                    child.trustedGuardians.push(guardian._id);
                    await child.save();
                }

                // Add Child to Guardian's monitored list
                if (!guardian.monitoredUsers.includes(child._id)) {
                    guardian.monitoredUsers.push(child._id);
                    await guardian.save();
                }
            }
        }

        res.json({ success: true, message: `Request ${status}` });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update request' });
    }
});

// Trigger Emergency Endpoint
// File Upload Endpoint
app.post('/upload', upload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    // Return the URL to access this file
    // In production, use standard domain. For dev, use relative or IP constructed on client.
    const fileUrl = `uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
});

// Create Incident Endpoint
app.post('/api/incidents/create', async (req, res) => {
    const { victimId, audioUrl, location, type } = req.body;
    try {
        const incident = new Incident({
            victimId,
            audioUrl,
            location,
            type
        });
        await incident.save();
        res.status(201).json({ success: true, incident });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create incident' });
    }
});

// Retrieve Wards' Incidents (Guardian Dashboard)
app.get('/api/incidents/my-wards/:guardianId', async (req, res) => {
    const { guardianId } = req.params;
    try {
        // 1. Find Guardian's monitored Users (Wards)
        // Since we are mocking the specific "Add Guardian" flow being tied to ID, 
        // We will just find users who have listed this guardian's PHONE number.
        // OR better, if we had the `monitoredUsers` array populated.

        // For Hackathon Speed Logic:
        // Find ALL incidents, populate victim, filter if needed? No, unsafe.

        // Let's assume the Guardian App sends their own ID. 
        // We find Users who have this Guardian in their `trustedGuardians` list.
        const wards = await User.find({ trustedGuardians: guardianId });
        const wardIds = wards.map(u => u._id);

        // Find Incidents for these wards
        const incidents = await Incident.find({ victimId: { $in: wardIds } })
            .sort({ timestamp: -1 })
            .populate('victimId', 'name phone');

        res.json({ success: true, incidents });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch incidents' });
    }
});

// Trigger Emergency Endpoint (Legacy SMS + New Incident)
app.post('/trigger-emergency', async (req, res) => {
    const { userId, location } = req.body;

    try {
        console.log(`EMERGENCY TRIGGERED for User ${userId}`);

        // Save minimal incident if no audio yet
        const incident = new Incident({
            victimId: userId,
            location,
            type: 'SOS_TRIGGER'
        });
        await incident.save();

        res.json({
            success: true,
            message: 'Alert sent to guardians',
            incidentId: incident._id
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Chat History Endpoint
app.get('/api/messages/:userId/:contactId', async (req, res) => {
    const { userId, contactId } = req.params;
    try {
        const messages = await Message.find({
            $or: [
                { sender: userId, receiver: contactId },
                { sender: contactId, receiver: userId }
            ]
        }).sort({ timestamp: 1 }); // Oldest first

        res.json({ success: true, messages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
