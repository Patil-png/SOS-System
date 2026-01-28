import { useState, useEffect } from 'react';
import { Accelerometer } from 'expo-sensors';
import { useSettings } from '../context/SettingsContext';

const WINDOW_SIZE = 5;

export const useShakeSensor = (onShake) => {
    const { settings } = useSettings();
    const THRESHOLD = settings.shakeSensitivity || 1.78;

    const [data, setData] = useState({ x: 0, y: 0, z: 0 });
    const [history, setHistory] = useState([]);

    useEffect(() => {
        let subscription = null;

        const subscribe = () => {
            Accelerometer.setUpdateInterval(100);
            subscription = Accelerometer.addListener(accelerometerData => {
                setData(accelerometerData);
                processData(accelerometerData);
            });
        };

        const processData = ({ x, y, z }) => {
            // Expo Accelerometer returns result in Gs (1g = 9.81m/s^2)
            // We compare G directly. 
            // Normal gravity is 1g. Shake adds acceleration.
            // Threshold of 1.78g is reasonable for a firm shake.
            const magnitude = Math.sqrt(x * x + y * y + z * z);

            setHistory(prev => {
                const newHistory = [...prev, magnitude];
                if (newHistory.length > WINDOW_SIZE) {
                    newHistory.shift();
                }

                // Simple Max or MA
                const maxInWindow = Math.max(...newHistory);

                // Using a ref or checking updated threshold would be better, 
                // but for now let's ensure the CALLBACK is fresh.
                if (maxInWindow > THRESHOLD) {
                    onShake();
                    return []; // Clear history after shake to prevent multi-fire
                }

                return newHistory;
            });
        };

        subscribe();

        return () => {
            subscription && subscription.remove();
        };
    }, [onShake]); // <--- CRITICAL FIX: Re-subscribe if onShake changes (which happens when isArmed changes)
};
