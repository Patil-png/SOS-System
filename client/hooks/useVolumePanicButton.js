import { useEffect, useRef } from 'react';
import SystemSetting from 'react-native-system-setting';

/**
 * useVolumePanicButton Hook
 * Detects 5 volume down button presses within 3 seconds
 * Triggers panic callback on pattern match
 * 
 * Works on Android with Expo Go!
 */
export const useVolumePanicButton = (onPanic, isEnabled = true) => {
    const pressTimesRef = useRef([]);
    const lastVolumeRef = useRef(null);
    const PRESS_WINDOW = 3000; // 3 seconds
    const REQUIRED_PRESSES = 5;

    useEffect(() => {
        if (!isEnabled) {
            console.log('⚠️ [VolumePanic] Disabled');
            return;
        }

        let volumeListener = null;

        const initVolumeListener = async () => {
            try {
                // Get initial volume
                const initialVolume = await SystemSetting.getVolume();
                lastVolumeRef.current = initialVolume;

                // Listen for volume changes
                volumeListener = SystemSetting.addVolumeListener((data) => {
                    const newVolume = data.value;
                    const oldVolume = lastVolumeRef.current;

                    // Detect volume DOWN press (decreased volume)
                    if (oldVolume !== null && newVolume < oldVolume) {
                        handleVolumePress();
                    }

                    lastVolumeRef.current = newVolume;
                });

                console.log('✅ [VolumePanic] Volume button listener active (press Vol Down 5x)');
            } catch (error) {
                console.log('⚠️ [VolumePanic] Could not set up listener:', error.message);
            }
        };

        initVolumeListener();

        return () => {
            if (volumeListener) {
                SystemSetting.removeVolumeListener(volumeListener);
                console.log('🔇 [VolumePanic] Listener removed');
            }
        };
    }, [onPanic, isEnabled]);

    const handleVolumePress = () => {
        const now = Date.now();

        // Add current press
        pressTimesRef.current.push(now);

        // Remove presses older than time window
        pressTimesRef.current = pressTimesRef.current.filter(
            time => now - time < PRESS_WINDOW
        );

        console.log(`📱 [VolumePanic] Volume down pressed (${pressTimesRef.current.length}/${REQUIRED_PRESSES})`);

        // Check if pattern matched
        if (pressTimesRef.current.length >= REQUIRED_PRESSES) {
            console.log('🚨 [VolumePanic] PANIC PATTERN DETECTED! Triggering SOS...');
            pressTimesRef.current = []; // Reset

            if (onPanic) {
                onPanic();
            }
        }
    };
};

export default useVolumePanicButton;
