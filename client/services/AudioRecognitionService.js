// Graceful fallback for when native modules aren't available
let loadTensorflowModel = null;
let LiveAudioStream = null;

try {
    const tflite = require('react-native-fast-tflite');
    loadTensorflowModel = tflite.loadTensorflowModel;
} catch (e) {
    console.warn('react-native-fast-tflite not available. Audio recognition disabled.');
}

try {
    LiveAudioStream = require('react-native-live-audio-stream').default;
} catch (e) {
    console.warn('react-native-live-audio-stream not available. Audio recognition disabled.');
}

import { Buffer } from 'buffer';

let MODEL_PATH = null;
try {
    MODEL_PATH = require('../assets/models/yamnet.tflite');
} catch (e) {
    console.warn('YAMNet model not found.');
}

// Key indices for YAMNet (approximate based on standard map)
// User wants: Screaming, Sirens, Glass breaking, Barking
const DANGEROUS_INDICES = {
    500: 'Screaming',
    501: 'Shrieking',
    504: 'Wailing',
    420: 'Explosion',
    421: 'Gunshot',
    316: 'Police car (siren)',
    317: 'Ambulance (siren)',
    318: 'Fire engine, fire truck (siren)',
    319: 'Emergency vehicle',
    439: 'Glass breaking',
    74: 'Dog',
    75: 'Bark',
    495: 'Crying, sobbing',
    496: 'Baby crying',
};

// Common sounds for debugging context (Speech, Silence, etc)
const DEBUG_LABELS = {
    0: 'Speech',
    494: 'Silence',
    67: 'Silence', // Another silence class
    137: 'Music',
    138: 'Musical instrument',
    139: 'Music',
    500: 'Screaming', // Re-map dangerous ones for debug lookup too
    501: 'Shrieking',
    316: 'Siren',
    420: 'Explosion'
};

// Threshold to trigger alert (0-1)
// Threshold to trigger alert (0-1)
const DETECTION_THRESHOLD = 0.35; // Sensitive (35%)
const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 15600; // 0.975s * 16000

class AudioRecognitionService {
    constructor() {
        this.model = null;
        this.isListening = false;
        this.audioBuffer = [];
        this.subscribers = [];
    }

    async loadModel() {
        try {
            this.model = await loadTensorflowModel(MODEL_PATH);
            console.log('YAMNet model loaded successfully');
        } catch (e) {
            console.error('Failed to load YAMNet model', e);
        }
    }

    initAudioStream() {
        LiveAudioStream.init({
            sampleRate: SAMPLE_RATE,
            channels: 1,
            bitsPerSample: 16,
            audioSource: 6, // VOICE_RECOGNITION
            bufferSize: 2048,
        });

        LiveAudioStream.on('data', (data) => {
            if (!this.model) return;
            this.processAudioChunk(data);
        });
    }

    processAudioChunk(base64Data) {
        // Convert base64 to int16 samples
        const buffer = Buffer.from(base64Data, 'base64');
        const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);

        // Normalize to float32 [-1, 1]
        for (let i = 0; i < samples.length; i++) {
            this.audioBuffer.push(samples[i] / 32768.0);
        }

        // While we have enough data for inference
        while (this.audioBuffer.length >= BUFFER_SIZE) {
            const inputChunk = this.audioBuffer.slice(0, BUFFER_SIZE);
            this.audioBuffer = this.audioBuffer.slice(BUFFER_SIZE); // Sliding window? Or disjoint?
            // For efficiency, let's just take the chunk and remove it. 
            // Better: Overlap? YAMNet usually takes .975s. 
            // For simplicity: Disjoint chunks.

            this.runInference(new Float32Array(inputChunk));
        }
    }

    async runInference(inputData) {
        if (!this.model) return;

        try {
            // YAMNet expects [15600] float32
            const result = await this.model.run([inputData]);
            // Result is [1, 521] float32
            const probabilities = result[0];

            this.analyzeResults(probabilities);

            // Debug: Log top prediction occasionally
            if (Math.random() < 0.1) {
                let maxIdx = 0;
                for (let i = 0; i < probabilities.length; i++) if (probabilities[i] > probabilities[maxIdx]) maxIdx = i;

                const name = DEBUG_LABELS[maxIdx] || DANGEROUS_INDICES[maxIdx] || 'Background/Other';
                console.log(`[Debug] Hearing: ${name} (Index ${maxIdx}, Conf: ${probabilities[maxIdx].toFixed(2)})`);
            }
        } catch (e) {
            console.error('Inference error:', e);
        }
    }

    analyzeResults(probabilities) {
        let detectedDanger = null;
        let maxScore = 0;

        for (const [index, label] of Object.entries(DANGEROUS_INDICES)) {
            const score = probabilities[index];

            // Dynamic Threshold: Lower for screaming/shrieking as YAMNet often under-confidences these
            let threshold = DETECTION_THRESHOLD;
            if (label === 'Screaming' || label === 'Shrieking') {
                threshold = 0.20; // Lower threshold to 20% for screams
            }

            if (score > threshold && score > maxScore) {
                maxScore = score;
                detectedDanger = label;
            }
        }

        if (detectedDanger) {
            console.log(`Detected: ${detectedDanger} (${maxScore.toFixed(2)})`);
            this.notifySubscribers(detectedDanger, maxScore);
        }
    }

    subscribe(callback) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    notifySubscribers(label, confidence) {
        this.subscribers.forEach(cb => cb({ label, confidence }));
    }

    async start() {
        if (!loadTensorflowModel || !LiveAudioStream) {
            console.warn('Audio recognition not available in this build. Skipping.');
            return;
        }
        if (this.isListening) return;

        // Request permissions
        try {
            const { Audio } = require('expo-av');
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                console.warn('Audio permission not granted');
                return;
            }
        } catch (e) {
            console.warn('Error requesting audio permission:', e);
        }

        if (!this.model) await this.loadModel();

        try {
            this.initAudioStream();
            LiveAudioStream.start();
            this.isListening = true;
            console.log('✅ The Ear is ACTIVE: Listening for Screaming, Glass Breaking, Gunshots...');
        } catch (e) {
            console.error('Failed to start audio stream:', e);
            this.isListening = false;
        }
    }

    stop() {
        if (LiveAudioStream) {
            LiveAudioStream.stop();
        }
        this.isListening = false;
        this.audioBuffer = [];
    }
}

export default new AudioRecognitionService();
