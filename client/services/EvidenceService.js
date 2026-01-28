import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { BASE_URL } from '../config';

let recording = null;
let incidentLocation = null;
const SERVER_URL = BASE_URL;

export const startEmergencyRecording = async (location = null) => {
    try {
        incidentLocation = location; // Store location
        console.log('Requesting permissions..');
        await Audio.requestPermissionsAsync();

        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });

        console.log('Starting recording..');
        const { recording: newRecording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recording = newRecording;
        console.log('Recording started');

        // Stop automatically after 30 seconds
        setTimeout(() => stopAndUploadRecording(), 30000);

    } catch (err) {
        console.error('Failed to start recording', err);
    }
};

export const stopAndUploadRecording = async () => {
    if (!recording) return;

    try {
        console.log('Stopping recording..');
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        console.log('Recording stopped and stored at', uri);
        recording = null;

        await uploadEvidence(uri);
    } catch (error) {
        console.error(error);
    }
};

const uploadEvidence = async (uri) => {
    try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) return;

        console.log('Uploading evidence...');

        // Upload File
        const uploadResult = await FileSystem.uploadAsync(`${SERVER_URL}/upload`, uri, {
            fieldName: 'audio',
            httpMethod: 'POST',
            uploadType: 1, // FileSystem.UploadType.MULTIPART
        });

        const response = JSON.parse(uploadResult.body);
        if (response.success) {
            console.log('File Uploaded:', response.url);

            // Create Incident Record
            await fetch(`${SERVER_URL}/api/incidents/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    victimId: userId,
                    audioUrl: response.url,
                    type: 'SOS_AUDIO',
                    location: incidentLocation || {} // Use stored location
                })
            });
            Alert.alert("Evidence Secure", "Audio recording uploaded to secure vault.");
        }
    } catch (error) {
        console.error("Upload failed", error);
        Alert.alert("Upload Failed", "Could not upload audio evidence.");
    }
};
