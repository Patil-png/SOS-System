import { useEffect, useRef } from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';

/**
 * useBackButtonPanic Hook
 * Detects 5 back button presses within 3 seconds
 * Triggers panic callback on pattern match
 * 
 * WORKS IN EXPO GO! No native modules needed.
 */
export const useBackButtonPanic = (onPanic, isEnabled = true) => {
    const pressTimesRef = useRef([]);
    const PRESS_WINDOW = 3000; // 3 seconds
    const REQUIRED_PRESSES = 5;

    useEffect(() => {
        if (Platform.OS !== 'android' || !isEnabled) {
            return;
        }

        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleBackPress();
            return true; // Prevent default back action
        });

        console.log('✅ [BackPanic] Back button panic active (press Back 5x)');

        return () => {
            backHandler.remove();
            console.log('🔙 [BackPanic] Listener removed');
        };
    }, [onPanic, isEnabled]);

    const handleBackPress = () => {
        const now = Date.now();

        // Add current press
        pressTimesRef.current.push(now);

        // Remove presses older than time window
        pressTimesRef.current = pressTimesRef.current.filter(
            time => now - time < PRESS_WINDOW
        );

        const remaining = REQUIRED_PRESSES - pressTimesRef.current.length;

        if (remaining > 0) {
            console.log(`📱 [BackPanic] Back pressed (${pressTimesRef.current.length}/${REQUIRED_PRESSES}) - ${remaining} more!`);

            // Show toast feedback
            if (Platform.OS === 'android') {
                ToastAndroid.show(`Press ${remaining} more times for PANIC SOS`, ToastAndroid.SHORT);
            }
        }

        // Check if pattern matched
        if (pressTimesRef.current.length >= REQUIRED_PRESSES) {
            console.log('🚨 [BackPanic] PANIC PATTERN DETECTED! Triggering SOS...');
            pressTimesRef.current = []; // Reset

            if (onPanic) {
                onPanic();
            }
        }
    };
};

export default useBackButtonPanic;
