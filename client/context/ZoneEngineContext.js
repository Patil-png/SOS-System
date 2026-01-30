import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import AudioRecognitionService from '../services/AudioRecognitionService';
import { getRiskScoreNodes } from '../services/CrimeDatabase';
import { startBackgroundUpdate, stopBackgroundUpdate } from '../services/BackgroundService';
import { startEmergencyRecording } from '../services/EvidenceService';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ZoneEngineContext = createContext();

export const ZoneEngineProvider = ({ children }) => {
    const [zoneStatus, setZoneStatus] = useState('GREEN'); // GREEN, ORANGE, RED
    const [riskReason, setRiskReason] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [audioDanger, setAudioDanger] = useState(null);
    const [isLocked, setIsLocked] = useState(false); // Lock state for safe word
    const [countdownSeconds, setCountdownSeconds] = useState(null); // 30s Countdown
    const [isSOSActive, setIsSOSActive] = useState(false); // True AFTER countdown fails
    const [isArmed, setIsArmed] = useState(false); // Master Toggle for Audio/Location
    const lastAlertTime = React.useRef(0); // Track last alert time
    const locationRef = React.useRef(null); // Store location synchronously
    const countdownInterval = React.useRef(null); // Ref for interval

    // Poll intervals
    const LOCATION_INTERVAL = 60000; // 1 min

    useEffect(() => {
        let locationSub = null;
        let stopAudioSub = () => { };

        const startServices = async () => {
            if (!isArmed) return;

            // 0. Background Service (Keeps App Alive & Shake Detection)
            startBackgroundUpdate();

            // 1. Audio
            stopAudioSub = AudioRecognitionService.subscribe(handleAudioAlert);
            AudioRecognitionService.start();

            // 2. Location
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                // Initial fetch
                const loc = await Location.getCurrentPositionAsync({});
                handleLocationUpdate(loc);

                // Watch with Foreground Service (Keeps App Alive)
                locationSub = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 10000,
                        distanceInterval: 50,
                        foregroundService: {
                            notificationTitle: "SOS System Active",
                            notificationBody: "Monitoring audio and location for safety...",
                            notificationColor: "#ff0000"
                        }
                    },
                    handleLocationUpdate
                );
            }
        };

        const stopServices = async () => {
            stopBackgroundUpdate();
            stopAudioSub();
            AudioRecognitionService.stop();
            if (locationSub) locationSub.remove();
        };

        if (isArmed) {
            startServices();
        } else {
            stopServices();
        }

        return () => {
            stopServices();
        };
    }, [isArmed]);

    const handleAudioAlert = ({ label, confidence }) => {
        console.log('Engine received audio alert:', label);

        // STRICT FILTER: Only Gunshot and Explosion allowed
        const ALLOWED_TRIGGERS = ['Gunshot', 'Explosion'];
        if (!ALLOWED_TRIGGERS.includes(label)) {
            console.log(`Ignoring non-critical sound: ${label}`);
            return;
        }

        const audioData = { label, confidence, timestamp: Date.now() };
        setAudioDanger(audioData);

        // Only evaluate if we have location data (use ref for immediate access)
        if (locationRef.current) {
            evaluateRisk(locationRef.current, audioData);
        } else {
            console.warn('⚠️ Audio alert received but location not ready yet. Will evaluate on next location update.');
        }
    };

    const handleLocationUpdate = async (location) => {
        locationRef.current = location;
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
        }

        // Auto-trigger actions (Trigger every time for RED, with debounce)
        if (newZone === 'RED') {
            const timeSinceLastAlert = Date.now() - lastAlertTime.current;

            if (timeSinceLastAlert > 3000) { // Debounce: Wait 3s between alerts
                console.warn('ZONE RED: STARTING COUNTDOWN');
                lastAlertTime.current = Date.now();

                // If already active or counting down, don't restart logic aggressively?
                // Actually, if SOS is already active, we just keep it active.
                if (isSOSActive) return;

                // If countdown already running, don't restart it
                if (countdownSeconds !== null) return;

                // 1. Lock App & Start Countdown
                setIsLocked(true);
                setCountdownSeconds(30);

                // Notify User to Respond
                const Notifications = require('expo-notifications');
                Notifications.scheduleNotificationAsync({
                    content: {
                        title: "⚠️ DANGER DETECTED (30s)",
                        body: "Reply with SAFE WORD to cancel SOS.",
                        categoryIdentifier: 'sos-reply', // Matches the category in App.jsx
                        data: { type: 'countdown_alert' },
                        priority: Notifications.AndroidNotificationPriority.HIGH,
                        sound: true,
                        vibrate: [0, 500],
                    },
                    trigger: null,
                });

                // Start Interval
                if (countdownInterval.current) clearInterval(countdownInterval.current);

                countdownInterval.current = setInterval(() => {
                    setCountdownSeconds(prev => {
                        if (prev <= 1) {
                            // Timer Finished
                            clearInterval(countdownInterval.current);
                            countdownInterval.current = null;
                            triggerSOS(audio ? audio.label : 'Danger');
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
        }
    };

    // Actual SOS Trigger (Siren + Notification)
    const triggerSOS = async (label) => {
        console.warn('🚨 COUNTDOWN EXPIRED: TRIGGERING FULL SOS 🚨');
        setIsSOSActive(true);
        const { startSiren } = require('../services/Siren');
        startSiren();

        // 1. Local Notification
        const Notifications = require('expo-notifications');
        Notifications.scheduleNotificationAsync({
            content: {
                title: "🚨 SOS ALERT SENT 🚨",
                body: `Emergency! ${label || 'Danger'} detected. Guardians notified.`,
                data: { type: 'danger_alert' },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
                vibrate: [0, 500, 500, 500],
            },
            trigger: null,
        });

        const incidentLoc = locationRef.current || userLocation;

        // 2. Start Evidence Recording (30s auto-upload)
        // Pass location so evidence service can tag it
        startEmergencyRecording(incidentLoc);

        // 3. IMMEDIATE: Send Incident to Backend (Instant Alert)
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (userId && incidentLoc) {
                await fetch(`${API_URL}/incidents/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        victimId: userId,
                        type: 'SOS_ALERT', // Type for Gunshot/Explosion
                        location: {
                            latitude: incidentLoc.coords.latitude,
                            longitude: incidentLoc.coords.longitude,
                            address: `Detected: ${label || 'Danger'}`
                        }
                    })
                });
                console.log("Immediate SOS Incident logged to backend.");
            }
        } catch (error) {
            console.error("Failed to log SOS incident:", error);
        }
    };

    return (
        <ZoneEngineContext.Provider value={{
            zoneStatus,
            riskReason,
            userLocation,
            audioDanger,
            isLocked,
            setIsLocked,
            countdownSeconds,
            isSOSActive,
            setCountdownSeconds, // Exported to allow reset
            setIsSOSActive,
            isArmed,
            setIsArmed
        }}>
            {children}
        </ZoneEngineContext.Provider>
    );
};

export const useZoneEngine = () => useContext(ZoneEngineContext);
