import { loadTensorflowModel } from 'react-native-fast-tflite';
import LiveAudioStream from 'react-native-live-audio-stream';
import { Buffer } from 'buffer';

const MODEL_PATH = require('../assets/models/yamnet.tflite');

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

// Threshold to trigger alert (0-1)
const DETECTION_THRESHOLD = 0.4;
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
        } catch (e) {
            console.error('Inference error:', e);
        }
    }

    analyzeResults(probabilities) {
        let detectedDanger = null;
        let maxScore = 0;

        for (const [index, label] of Object.entries(DANGEROUS_INDICES)) {
            const score = probabilities[index];
            if (score > DETECTION_THRESHOLD && score > maxScore) {
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

    start() {
        if (this.isListening) return;
        if (!this.model) this.loadModel();
        this.initAudioStream();
        LiveAudioStream.start();
        this.isListening = true;
    }

    stop() {
        LiveAudioStream.stop();
        this.isListening = false;
        this.audioBuffer = [];
    }
}

export default new AudioRecognitionService();
