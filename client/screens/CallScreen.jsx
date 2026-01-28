import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform, Dimensions, Alert } from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import createAgoraRtcEngine, { ChannelProfileType, ClientRoleType, RtcSurfaceView } from 'react-native-agora';
import ChatService from '../services/ChatService';

const { width, height } = Dimensions.get('window');

// REPLACE WITH YOUR AGORA APP ID
const AGORA_APP_ID = 'YOUR_AGORA_APP_ID';

const CallScreen = ({ route, navigation }) => {
    const { channelId, contactName, isIncoming, callerName } = route.params;
    const [isJoined, setIsJoined] = useState(false);
    const [remoteUid, setRemoteUid] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaker, setIsSpeaker] = useState(false);
    const [callStatus, setCallStatus] = useState(isIncoming ? 'Incoming Call...' : 'Calling...');

    const agoraEngineRef = useRef();

    useEffect(() => {
        setupVideoCall();
        return () => {
            leaveCall();
        };
    }, []);

    const setupVideoCall = async () => {
        try {
            // 1. Initialize Agora
            agoraEngineRef.current = createAgoraRtcEngine();
            const engine = agoraEngineRef.current;

            engine.initialize({ appId: AGORA_APP_ID });

            // 2. Enable Audio
            engine.enableAudio();

            // 3. Set Channel Profile
            engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);

            // 4. Register Event Listeners
            engine.registerEventHandler({
                onJoinChannelSuccess: () => {
                    console.log('Successfully joined channel: ' + channelId);
                    setIsJoined(true);
                    setCallStatus('Connected');
                },
                onUserJoined: (_connection, uid) => {
                    console.log('Remote user joined: ' + uid);
                    setRemoteUid(uid);
                    setCallStatus('In Call');
                },
                onUserOffline: (_connection, uid) => {
                    console.log('Remote user left: ' + uid);
                    setRemoteUid(0);
                    setCallStatus('Call Ended');
                    setTimeout(() => navigation.goBack(), 1000);
                },
            });

            // 5. Join Channel
            // In a real app, you fetch a Token from your backend for security. 
            // For testing/hackathon, use `null` if App Certificate is disabled, or a temp token.
            engine.joinChannel(null, channelId, 0, {});

        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to initialize call');
        }
    };

    const leaveCall = () => {
        try {
            agoraEngineRef.current?.leaveChannel();
            setRemoteUid(0);
            setIsJoined(false);
            navigation.goBack();
        } catch (e) {
            console.error(e);
        }
    };

    const toggleMute = () => {
        const newMuteState = !isMuted;
        agoraEngineRef.current?.muteLocalAudioStream(newMuteState);
        setIsMuted(newMuteState);
    };

    const toggleSpeaker = () => {
        const newSpeakerState = !isSpeaker;
        agoraEngineRef.current?.setEnableSpeakerphone(newSpeakerState);
        setIsSpeaker(newSpeakerState);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.background}>
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>
                            {(isIncoming ? callerName : contactName)?.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.contactName}>{isIncoming ? callerName : contactName}</Text>
                    <Text style={styles.statusText}>{callStatus}</Text>
                </View>

                <View style={styles.controlsContainer}>
                    <TouchableOpacity
                        style={[styles.controlBtn, isMuted && styles.activeControlBtn]}
                        onPress={toggleMute}
                    >
                        <Ionicons name={isMuted ? "mic-off" : "mic"} size={32} color="#FFF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.endCallBtn]}
                        onPress={leaveCall}
                    >
                        <MaterialIcons name="call-end" size={36} color="#FFF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.controlBtn, isSpeaker && styles.activeControlBtn]}
                        onPress={toggleSpeaker}
                    >
                        <Ionicons name={isSpeaker ? "volume-high" : "volume-off"} size={32} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    background: {
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: 80,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginTop: 40,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#1E293B',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 2,
        borderColor: '#334155',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    avatarText: {
        fontSize: 48,
        color: '#F8FAFC',
        fontWeight: 'bold',
    },
    contactName: {
        fontSize: 28,
        fontWeight: '700',
        color: '#F8FAFC',
        marginBottom: 8,
    },
    statusText: {
        fontSize: 16,
        color: '#94A3B8',
        fontWeight: '500',
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        width: '100%',
        paddingHorizontal: 40,
    },
    controlBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeControlBtn: {
        backgroundColor: '#F8FAFC',
        // Invert icon color logic in render if needed, or keeping white on white is bad...
        // Let's keep icon color white for now, but maybe change bg to something else or icon color.
        // Actually for simplicity, let's just change BG opacity.
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    endCallBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F43F5E',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#F43F5E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
});

export default CallScreen;
