import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import AudioRecognitionService from '../services/AudioRecognitionService';
import { getRiskScoreNodes } from '../services/CrimeDatabase';

const ZoneEngineContext = createContext();

export const ZoneEngineProvider = ({ children }) => {
    const [zoneStatus, setZoneStatus] = useState('GREEN'); // GREEN, ORANGE, RED
    const [riskReason, setRiskReason] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [audioDanger, setAudioDanger] = useState(null);

    // Poll intervals
    const LOCATION_INTERVAL = 60000; // 1 min

    useEffect(() => {
        let locationSub = null;

        const startServices = async () => {
            // 1. Audio
            const stopAudioSub = AudioRecognitionService.subscribe(handleAudioAlert);
            AudioRecognitionService.start();

            // 2. Location
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                // Initial fetch
                const loc = await Location.getCurrentPositionAsync({});
                handleLocationUpdate(loc);

                // Watch
                locationSub = await Location.watchPositionAsync(
                    { accuracy: Location.Accuracy.High, timeInterval: 30000, distanceInterval: 100 },
                    handleLocationUpdate
                );
            }

            return () => {
                stopAudioSub();
                AudioRecognitionService.stop();
                if (locationSub) locationSub.remove();
            };
        };

        const cleanup = startServices();
        return () => { cleanup.then(c => c && c()); };
    }, []);

    const handleAudioAlert = ({ label, confidence }) => {
        console.log('Engine received audio alert:', label);
        setAudioDanger({ label, confidence, timestamp: Date.now() });
        evaluateRisk(userLocation, { label, confidence });
    };

    const handleLocationUpdate = async (location) => {
        setUserLocation(location);
        evaluateRisk(location, audioDanger);
    };

    const evaluateRisk = async (location, audio) => {
        if (!location) return;

        let newZone = 'GREEN';
        let reasons = [];

        // 1. Time Check (Night is risky)
        const hour = new Date().getHours();
        const isNight = hour >= 22 || hour <= 5;
        if (isNight) reasons.push('Late Night');

        // 2. Location Risk
        const riskScore = await getRiskScoreNodes(location.coords.latitude, location.coords.longitude);
        const isRiskyArea = riskScore > 50;
        if (isRiskyArea) reasons.push('High Crime Zone');

        // 3. Audio Risk (Immediate Trigger)
        let isDangerousSound = false;
        if (audio && (Date.now() - (audio.timestamp || Date.now())) < 30000) {
            // If audio detected within last 30 seconds
            reasons.push(`Sound: ${audio.label}`);
            isDangerousSound = true;
        }

        // Logic Tree
        if (isDangerousSound) {
            newZone = 'RED'; // Immediate Danger
        } else if (isNight && isRiskyArea) {
            newZone = 'ORANGE'; // Caution
        } else if (isRiskyArea) {
            newZone = 'YELLOW'; // Be Aware (Custom)
        }

        // Update Status
        if (newZone !== zoneStatus) {
            setZoneStatus(newZone);
            setRiskReason(reasons.join(', '));

            // Auto-trigger actions could go here (e.g. Navigation to Fake Call)
            if (newZone === 'RED') {
                // Trigger SOS Sequence?
                console.warn('ZONE RED: TRIGGERING SOS LOGIC');
            }
        }
    };

    return (
        <ZoneEngineContext.Provider value={{ zoneStatus, riskReason, userLocation, audioDanger }}>
            {children}
        </ZoneEngineContext.Provider>
    );
};

export const useZoneEngine = () => useContext(ZoneEngineContext);
