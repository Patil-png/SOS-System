import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import AudioRecognitionService from '../services/AudioRecognitionService';
import VoiceTriggerService, { getVoiceTriggerService } from '../services/VoiceTriggerService';
import { getRiskScoreNodes } from '../services/CrimeDatabase';
import { startBackgroundUpdate, stopBackgroundUpdate } from '../services/BackgroundService';
import { useBackButtonPanic } from '../hooks/useBackButtonPanic';

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
    const [isVoiceTriggerEnabled, setIsVoiceTriggerEnabled] = useState(false); // Voice "Bachao" detection
    const lastAlertTime = React.useRef(0); // Track last alert time
    const locationRef = React.useRef(null); // Store location synchronously
    const countdownInterval = React.useRef(null); // Ref for interval
    const voiceTriggerServiceRef = React.useRef(null); // Ref for voice service

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

    // Voice Trigger Management
    useEffect(() => {
        let unsubscribe = null;

        if (isVoiceTriggerEnabled) {
            console.log('🎤 [ZoneEngine] Starting voice trigger service...');
            const service = getVoiceTriggerService();
            voiceTriggerServiceRef.current = service;

            // Subscribe to voice detection events
            unsubscribe = service.subscribe(handleVoiceDetection);
        } else {
            console.log('🎤 [ZoneEngine] Voice trigger disabled');
            voiceTriggerServiceRef.current = null;
        }

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [isVoiceTriggerEnabled]);

    // Handle voice detection (immediate SOS trigger)
    const handleVoiceDetection = ({ triggerWord, fullText }) => {
        console.log(`🚨 [ZoneEngine] Voice trigger detected: "${triggerWord}" in "${fullText}"`);

        // Immediate SOS trigger - no countdown for voice command!
        triggerSOS(`Voice Command: ${triggerWord}`);
    };

    // Back Button Panic (5x back button = immediate SOS) - WORKS IN EXPO GO!
    useBackButtonPanic(() => {
        console.log('🚨 [ZoneEngine] Back button panic triggered!');
        triggerSOS('Back Button Panic');
    }, isArmed); // Only active when armed

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

    // Actual SOS Trigger (Siren + Notification + Recording + Guardian Alert)
    const triggerSOS = async (label) => {
        console.warn('🚨 COUNTDOWN EXPIRED: TRIGGERING FULL SOS 🚨');
        setIsSOSActive(true);

        // 1. Start Siren
        const { startSiren } = require('../services/Siren');
        startSiren();

        // 2. Get Location immediately
        let currentLocation = null;
        try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            currentLocation = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                address: "Emergency Location"
            };
            console.log('📍 [triggerSOS] Location captured:', currentLocation);
        } catch (e) {
            console.log('⚠️ [triggerSOS] Failed to get location:', e);
        }

        // 3. Start 30-Second Audio Recording with Location
        const { startEmergencyRecording } = require('../services/EvidenceService');
        startEmergencyRecording(currentLocation);
        console.log('🎙️ [triggerSOS] Emergency recording started');

        // 4. Send Incident to Backend (Guardian sees it on Network tab)
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const userId = await AsyncStorage.getItem('userId');

            if (userId && currentLocation) {
                const { API_URL } = require('../config');
                await fetch(`${API_URL}/incidents/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        victimId: userId,
                        type: 'SOS_ALERT',
                        triggerType: label, // "Back Button Panic", "Voice Command: bachao", "Gunshot", etc.
                        location: currentLocation
                    })
                });
                console.log('✅ [triggerSOS] Guardian notified via API');
            }
        } catch (error) {
            console.log('❌ [triggerSOS] Failed to notify guardians:', error);
        }

        // 5. Show Local Notification
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
            setIsArmed,
            isVoiceTriggerEnabled,
            setIsVoiceTriggerEnabled
        }}>
            {children}
            {/* Render Voice Trigger Service (hidden WebView) */}
            {isVoiceTriggerEnabled && <VoiceTriggerService ref={voiceTriggerServiceRef} />}
        </ZoneEngineContext.Provider>
    );
};

export const useZoneEngine = () => useContext(ZoneEngineContext);
