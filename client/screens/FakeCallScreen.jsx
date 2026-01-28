import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, Image, TouchableOpacity, Dimensions, Platform, StatusBar } from 'react-native';
import { Audio } from 'expo-av';
import { MaterialCommunityIcons, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; // npx expo install expo-linear-gradient
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// Android usually has a dark blue/grey default gradient for calls
const ANDROID_GRADIENT = ['#202124', '#202124'];

const RINGTONE_SOUND = require('../assets/FakeCall.aac');

export default function FakeCallScreen({ navigation }) {
    const [sound, setSound] = useState();
    const [callStatus, setCallStatus] = useState('incoming'); // incoming, connected
    const [timer, setTimer] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaker, setIsSpeaker] = useState(false);
    const timerInterval = useRef(null);

    useEffect(() => {
        playRingtone();
        return () => {
            stopRingtone();
            if (timerInterval.current) clearInterval(timerInterval.current);
        };
    }, []);

    const playRingtone = async () => {
        try {
            const { sound } = await Audio.Sound.createAsync(
                RINGTONE_SOUND,
                { shouldPlay: true, isLooping: true }
            );
            setSound(sound);
        } catch (error) {
            console.log('Error playing ringtone:', error);
        }
    };

    const stopRingtone = async () => {
        if (sound) {
            try {
                await sound.stopAsync();
                await sound.unloadAsync();
            } catch (e) { console.log(e); }
        }
    };

    const handleAccept = async () => {
        await stopRingtone();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCallStatus('connected');
        timerInterval.current = setInterval(() => {
            setTimer(prev => prev + 1);
        }, 1000);
    };

    const handleDecline = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        await stopRingtone();
        navigation.goBack();
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // --- Android Style Components ---

    const AndroidControlBtn = ({ icon, label, active, onPress, type = 'material' }) => (
        <TouchableOpacity
            style={[styles.androidCtrlBtn, active && styles.androidCtrlBtnActive]}
            onPress={() => {
                if (onPress) onPress();
                Haptics.selectionAsync();
            }}
        >
            {type === 'ionicons' ? (
                <Ionicons name={icon} size={32} color={active ? "#202124" : "#fff"} />
            ) : (
                <MaterialCommunityIcons name={icon} size={32} color={active ? "#202124" : "#fff"} />
            )}
            {/* Android labels usually don't show active state color change, just the button bg */}
            <Text style={[styles.androidCtrlLabel, active && { color: '#000' }]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#202124" />

            {/* Android Dark Background */}
            <LinearGradient colors={ANDROID_GRADIENT} style={styles.background} />

            {/* Top Section: Info */}
            <View style={styles.topContainer}>
                {/* Android shows 'Incoming voice call' at very top */}
                {callStatus === 'incoming' && (
                    <View style={styles.incomingHeader}>
                        <MaterialIcons name="call" size={16} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.incomingHeaderText}>Incoming voice call</Text>
                    </View>
                )}

                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarLetter}>D</Text>
                </View>

                <Text style={styles.callerName}>Dad</Text>

                {callStatus === 'connected' ? (
                    <Text style={styles.timerText}>{formatTime(timer)}</Text>
                ) : (
                    <Text style={styles.callerNumber}>Mobile +91 98xxx xxxxx</Text>
                )}
            </View>

            {/* Bottom Section: Actions */}
            <View style={styles.bottomContainer}>

                {callStatus === 'connected' ? (
                    /* === CONNECTED (Android Grid) === */
                    <View style={styles.connectedWrapper}>
                        <View style={styles.gridContainer}>
                            <View style={styles.gridRow}>
                                <AndroidControlBtn
                                    icon="microphone-off"
                                    label="Mute"
                                    active={isMuted}
                                    onPress={() => setIsMuted(!isMuted)}
                                />
                                <AndroidControlBtn icon="dialpad" label="Keypad" />
                                <AndroidControlBtn
                                    icon="volume-high"
                                    label="Speaker"
                                    active={isSpeaker}
                                    onPress={() => setIsSpeaker(!isSpeaker)}
                                />
                            </View>
                            <View style={styles.gridRow}>
                                <AndroidControlBtn icon="plus" label="Add call" />
                                <AndroidControlBtn icon="video-outline" label="Video call" />
                                <AndroidControlBtn icon="pause" label="Hold" />
                            </View>
                        </View>

                        <TouchableOpacity style={styles.endCallButton} onPress={handleDecline}>
                            <MaterialCommunityIcons name="phone-hangup" size={36} color="#fff" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    /* === INCOMING (Swipe/Buttons) === */
                    <View style={styles.incomingWrapper}>
                        <TouchableOpacity style={styles.replyBtn}>
                            <MaterialCommunityIcons name="message-text-outline" size={24} color="#fff" />
                            <Text style={styles.replyText}>Reply</Text>
                        </TouchableOpacity>

                        <View style={styles.incomingActionRow}>
                            {/* Decline Button (Left) */}
                            <View style={{ alignItems: 'center' }}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: '#FF3B30' }]} // Red
                                    onPress={handleDecline}
                                >
                                    <MaterialCommunityIcons name="phone-hangup" size={32} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.actionLabel}>Decline</Text>
                            </View>

                            {/* Answer Button (Right) */}
                            <View style={{ alignItems: 'center' }}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: '#00C853' }]} // Android Green
                                    onPress={handleAccept}
                                >
                                    <MaterialCommunityIcons name="phone" size={32} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.actionLabel}>Answer</Text>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#202124',
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },

    // --- Top Info ---
    topContainer: {
        flex: 1, // Takes up top half space
        alignItems: 'center',
        paddingTop: height * 0.1,
    },
    incomingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        opacity: 0.8,
    },
    incomingHeaderText: {
        color: '#fff',
        fontSize: 14,
        marginLeft: 8,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#A50034', // Android typically assigns a random color
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        elevation: 5,
    },
    avatarLetter: {
        color: '#fff',
        fontSize: 48,
        fontWeight: '500',
    },
    callerName: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '400', // Android fonts are usually standard weight
        marginBottom: 8,
    },
    callerNumber: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 16,
    },
    timerText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 18,
        marginTop: 5,
    },

    // --- Bottom Controls ---
    bottomContainer: {
        paddingBottom: 50,
        width: '100%',
    },

    // --- Connected Grid ---
    connectedWrapper: {
        alignItems: 'center',
    },
    gridContainer: {
        width: '85%',
        marginBottom: 40,
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    androidCtrlBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
        height: 80,
        borderRadius: 40,
        // Android buttons are usually transparent unless active
    },
    androidCtrlBtnActive: {
        backgroundColor: '#fff',
    },
    androidCtrlLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginTop: 8,
    },
    endCallButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3.84,
    },

    // --- Incoming Actions ---
    incomingWrapper: {
        width: '100%',
        paddingHorizontal: 40,
        paddingBottom: 40,
    },
    replyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignSelf: 'flex-start',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 24,
        marginBottom: 50,
    },
    replyText: {
        color: '#fff',
        marginLeft: 8,
        fontSize: 14,
    },
    incomingActionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    actionButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        elevation: 4,
    },
    actionLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
    },
});