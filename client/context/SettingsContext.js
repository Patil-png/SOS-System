import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        shakeSensitivity: 1.78, // Default
        radius: 100,
        safeWord: '',
        isStealth: false,
        shakeEnabled: true,
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const keys = ['shakeSensitivity', 'deviationRadius', 'safeWord', 'stealthMode', 'shakeEnabled'];
            const result = await AsyncStorage.multiGet(keys);
            const stores = Object.fromEntries(result);

            setSettings({
                shakeSensitivity: stores.shakeSensitivity ? parseFloat(stores.shakeSensitivity) : 1.78,
                radius: stores.deviationRadius ? parseInt(stores.deviationRadius) : 100,
                safeWord: stores.safeWord || '',
                isStealth: stores.stealthMode === 'true',
                shakeEnabled: stores.shakeEnabled !== 'false', // Default to true if not set
            });
        } catch (e) {
            console.error("Failed to load settings", e);
        }
    };

    const updateSetting = async (key, value) => {
        // Update State immediately
        setSettings(prev => ({ ...prev, [key]: value }));

        // Persist
        let storeKey = '';
        if (key === 'shakeSensitivity') storeKey = 'shakeSensitivity';
        else if (key === 'radius') storeKey = 'deviationRadius';
        else if (key === 'safeWord') storeKey = 'safeWord';
        else if (key === 'isStealth') storeKey = 'stealthMode';
        else if (key === 'shakeEnabled') storeKey = 'shakeEnabled';

        if (storeKey) {
            await AsyncStorage.setItem(storeKey, String(value));
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSetting }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
