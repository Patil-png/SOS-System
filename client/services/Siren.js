import { Audio } from 'expo-av';

let soundObject = null;

export const toggleSiren = async () => {
    try {
        if (soundObject) {
            // Stop if playing
            console.log('Stopping Siren...');
            await soundObject.stopAsync();
            await soundObject.unloadAsync();
            soundObject = null;
            return false; // Is not playing
        } else {
            // Configure audio mode to play even in silent mode
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
            });

            console.log('Loading Siren...');
            const { sound } = await Audio.Sound.createAsync(
                require('../assets/siren.mp3'),
                { shouldPlay: true, isLooping: true, volume: 1.0 }
            );

            soundObject = sound;
            console.log('Siren Playing');
            return true; // Is playing
        }
    } catch (error) {
        console.error("Error toggling siren:", error);
        return false;
    }
};

// Start siren (only if not already playing)
export const startSiren = async () => {
    if (!soundObject) {
        await toggleSiren();
    }
};

// Stop siren (only if playing)
export const stopSiren = async () => {
    if (soundObject) {
        await toggleSiren();
    }
};
