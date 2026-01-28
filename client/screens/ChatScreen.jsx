import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, FlatList, StyleSheet, KeyboardAvoidingView, Platform, StatusBar, Linking, Alert, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import ChatService from '../services/ChatService';
import LiveMapBubble from '../components/LiveMapBubble';
import LiveLocationCard from '../components/LiveLocationCard';
import AudioPlayer from '../components/AudioPlayer';
import * as SMS from 'expo-sms'; // Add Import
import { BASE_URL } from '../config';

const API_URL = BASE_URL;
const { width } = Dimensions.get('window');

// Modern Midnight Palette
const THEME = {
    bg: '#0F172A',            // Deep Slate Blue (Rich Dark Background)
    header: '#0F172A',        // Seamless Header
    surface: '#1E293B',       // Card/Input Background
    primary: '#6366F1',       // Indigo 500 (Vibrant Sent Bubble)
    secondary: '#334155',     // Slate 700 (Received Bubble)
    text: '#F8FAFC',          // Slate 50
    textDim: '#94A3B8',       // Slate 400
    accent: '#38BDF8',        // Sky Blue (Icons)
    danger: '#F43F5E',        // Rose (Live Tracking)
    success: '#10B981',       // Emerald
    liveBorder: 'rgba(244, 63, 94, 0.5)', // Glowing Red Border
};

export default function ChatScreen({ route, navigation }) {
    const { contactId, contactName } = route.params;
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [contactPhone, setContactPhone] = useState(null);
    const [userId, setUserId] = useState(null);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showDurationPicker, setShowDurationPicker] = useState(false);
    const [showCallPicker, setShowCallPicker] = useState(false);
    const [isAgoraAvailable, setIsAgoraAvailable] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const recordingRef = useRef(null); // Refactor to Ref to avoid closure staleness
    const recordingStartTime = useRef(null); // Track start time for accurate duration
    const [recordingDuration, setRecordingDuration] = useState(0);
    const flatListRef = useRef();
    const activeLiveMessageId = useRef(null);
    const recordingInterval = useRef(null);

    useEffect(() => {
        setupChat();
        return () => {
            // Cleanup recording if component unmounts
            if (recordingRef.current) {
                recordingRef.current.stopAndUnloadAsync().catch(e => console.log('Cleanup error:', e));
            }
            if (recordingInterval.current) {
                clearInterval(recordingInterval.current);
            }
        };
    }, []);

    const setupChat = async () => {
        const myId = await AsyncStorage.getItem('userId');
        setUserId(myId);

        ChatService.connect(myId);
        fetchHistory(myId);
        fetchContactInfo();
        checkAgoraAvailability();

        ChatService.onReceiveMessage((data, isUpdate) => {
            if (isUpdate) {
                setMessages(prev => prev.map(msg =>
                    msg._id === data.messageId ? { ...msg, location: data.location } : msg
                ));
            } else {
                const message = data;
                if (message.sender === contactId || message.sender === myId) {
                    if (message.sender === contactId || message.sender === myId) {
                        setMessages(prev => [...prev, message]);
                    }
                }
            }
        });

        ChatService.onMessageSent((data) => {
            setMessages(prev => prev.map(msg =>
                (msg._id === data.tempId || msg.isPending) && msg.content === data.message.content
                    ? data.message
                    : msg
            ));

            if (data.message.content.includes('LIVE')) {
                activeLiveMessageId.current = data.message._id;
            }
        });
    };

    const startLiveTracking = async (duration = 30000, label = '30s') => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        setShowDurationPicker(false); // Close picker if open
        Alert.alert("Live Tracking", `Sharing real-time location for ${label}...`);

        let loc = await Location.getLastKnownPositionAsync({});
        if (!loc) {
            loc = await Location.getCurrentPositionAsync({});
        }

        ChatService.sendMessage(userId, contactId, `LIVE TRACKING (${label}) 🔴`, 'location', loc.coords);

        const subscription = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
            (newLoc) => {
                if (activeLiveMessageId.current) {
                    ChatService.sendLiveLocationUpdate(activeLiveMessageId.current, contactId, newLoc.coords);
                    setMessages(prev => prev.map(msg =>
                        msg._id === activeLiveMessageId.current ? { ...msg, location: newLoc.coords } : msg
                    ));
                }
            }
        );

        setTimeout(() => {
            subscription.remove();
            Alert.alert("Tracking Ended", "Live location stopped.");
            activeLiveMessageId.current = null;
        }, duration);
    };

    const fetchHistory = async (myId) => {
        try {
            const response = await fetch(`${API_URL}/api/messages/${myId}/${contactId}`);
            const data = await response.json();
            if (data.success) {
                if (data.success) {
                    setMessages(data.messages);
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchContactInfo = async () => {
        try {
            const response = await fetch(`${API_URL}/api/user/${contactId}`);
            const data = await response.json();
            if (data.success) {
                setContactPhone(data.user.phone);
            }
        } catch (error) {
            console.error("Error fetching contact info:", error);
        }
    };

    const checkAgoraAvailability = () => {
        // Instead of requiring the module (which throws errors in Expo Go),
        // we'll check if the CallScreen route exists in navigation
        // This is set conditionally in App.jsx based on whether Agora loaded
        try {
            const routes = navigation.getState()?.routes || [];
            const hasCallScreen = navigation.getParent()?.getState()?.routeNames?.includes('CallScreen');
            setIsAgoraAvailable(hasCallScreen || false);
        } catch (e) {
            // If navigation check fails, assume Agora is not available
            setIsAgoraAvailable(false);
        }
    };

    const handleCallPress = () => {
        setShowCallPicker(true);
    };

    const startCellularCall = () => {
        setShowCallPicker(false);
        if (!contactPhone) {
            Alert.alert("Unavailable", "Phone number not found for this contact.");
            return;
        }
        Linking.openURL(`tel:${contactPhone}`);
    };

    const startVoIPCall = () => {
        setShowCallPicker(false);

        if (!isAgoraAvailable) {
            Alert.alert(
                "Feature Unavailable",
                "VoIP calling requires a Development Client build. Please use the Mobile Call option or rebuild the app with 'npx expo run:android'."
            );
            return;
        }

        // Navigate to CallScreen with channelId = chat room id (e.g. sorted user IDs or unique ID)
        // For simplicity, using a sorted combo of IDs to ensure unique room for pair
        const channelId = [userId, contactId].sort().join('_');

        navigation.navigate('CallScreen', {
            channelId,
            contactName,
            isIncoming: false
        });

        // Trigger socket event for signaling (Will implement in next step or assume service handles it)
        ChatService.startCall(userId, contactId, channelId);
    };

    // Audio Recording Functions
    const startRecording = async () => {
        try {
            console.log('Starting recording...');

            // Clean up any existing recording first
            if (recordingRef.current) {
                try {
                    await recordingRef.current.stopAndUnloadAsync();
                } catch (e) {
                    console.log('Error cleaning up previous recording:', e);
                }
                recordingRef.current = null;
            }

            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant microphone permission to record audio.');
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            recordingRef.current = newRecording;
            recordingStartTime.current = Date.now(); // Set start time
            setIsRecording(true);
            setRecordingDuration(0);

            console.log('Recording started successfully');

            // Start duration counter
            recordingInterval.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Failed to start recording:', error);
            Alert.alert('Error', 'Failed to start recording: ' + error.message);
            setIsRecording(false);
            recordingRef.current = null;
        }
    };

    const stopRecording = async () => {
        console.log('stopRecording called, recording exists:', !!recordingRef.current);
        if (!recordingRef.current) return;

        try {
            console.log('Stopping recording...');
            clearInterval(recordingInterval.current);
            setIsRecording(false);

            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            recordingRef.current = null;

            console.log('Recording stopped, URI:', uri);

            // Calculate final duration
            const finalDuration = recordingStartTime.current ? Math.round((Date.now() - recordingStartTime.current) / 1000) : recordingDuration;

            // Upload audio
            if (uri) {
                await uploadAudio(uri, finalDuration);
            }
            setRecordingDuration(0);
        } catch (error) {
            console.error('Failed to stop recording:', error);
        }
    };

    const cancelRecording = async () => {
        if (!recordingRef.current) return;

        try {
            clearInterval(recordingInterval.current);
            setIsRecording(false);
            await recordingRef.current.stopAndUnloadAsync();
            recordingRef.current = null;
            setRecordingDuration(0);
        } catch (error) {
            console.error('Failed to cancel recording:', error);
        }
    };

    const uploadAudio = async (audioUri, duration) => {
        try {
            const formData = new FormData();
            formData.append('audio', {
                uri: audioUri,
                type: 'audio/m4a',
                name: `audio_${Date.now()}.m4a`,
            });
            formData.append('duration', duration.toString());

            const response = await fetch(`${API_URL}/api/upload-audio`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const data = await response.json();
            console.log('Upload response:', data); // Debug log

            if (data.success) {
                // Send audio message
                const tempMsg = {
                    _id: Date.now().toString(),
                    sender: userId,
                    receiver: contactId,
                    content: 'Voice message',
                    type: 'audio',
                    audioUrl: data.audioUrl,
                    duration: data.duration,
                    timestamp: new Date().toISOString(),
                    isPending: true
                };
                console.log('Sending audio message:', tempMsg); // Debug log
                setMessages(prev => [...prev, tempMsg]);

                ChatService.sendMessage(userId, contactId, 'Voice message', 'audio', null, data.audioUrl, data.duration);
            }
        } catch (error) {
            console.error('Failed to upload audio:', error);
            Alert.alert('Error', 'Failed to send voice message');
        }
    };

    const sendMessage = () => {
        if (!inputText.trim()) return;
        const content = inputText.trim();
        setInputText('');

        const tempMsg = {
            _id: Date.now().toString(),
            sender: userId,
            receiver: contactId,
            content: content,
            timestamp: new Date().toISOString(),
            isPending: true
        };
        setMessages(prev => [...prev, tempMsg]);

        ChatService.sendMessage(userId, contactId, content);
    };

    const handleShareLocation = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Allow location access to share your position.');
            return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        const tempMsg = {
            _id: Date.now().toString(),
            sender: userId,
            receiver: contactId,
            content: 'Shared a location',
            type: 'location',
            location: { latitude, longitude },
            timestamp: new Date().toISOString(),
            isPending: true
        };
        setMessages(prev => [...prev, tempMsg]);

        ChatService.sendMessage(userId, contactId, 'Shared a location', 'location', { latitude, longitude });
    };

    const openMap = (lat, lng) => {
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${lat},${lng}`;
        const label = 'Secure Location';
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });
        Linking.openURL(url);
    };



    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // ... inside handleSOSBundle ...
    const handleSOSBundle = async () => {
        Alert.alert("Sending SOS", "Sharing Location, Live Track, and Recording 30s Audio to this contact...\n\nAlso alerting Guardians!");
        setShowAttachMenu(false);

        // 1. Text Alert (Chat)
        const content = "🚨 **SOS ALERT** 🚨\nI am unsafe! Sending my location and audio evidence.";
        const tempMsg = {
            _id: Date.now().toString(),
            sender: userId,
            receiver: contactId,
            content: content,
            timestamp: new Date().toISOString(),
            isPending: true
        };
        setMessages(prev => [...prev, tempMsg]);
        ChatService.sendMessage(userId, contactId, content);

        // 2. Static Location & Global Alert
        let location = await Location.getCurrentPositionAsync({});
        // Chat Share
        ChatService.sendMessage(userId, contactId, 'Shared a location', 'location', location.coords);
        const tempLocMsg = {
            _id: Date.now().toString() + 'loc',
            sender: userId,
            receiver: contactId,
            content: 'Shared a location',
            type: 'location',
            location: location.coords,
            timestamp: new Date().toISOString(),
            isPending: true
        };
        setMessages(prev => [...prev, tempLocMsg]);

        // --- NEW: Global Alert to Guardians (SMS + Backend) ---
        try {
            // A. Send Backend Incident
            await fetch(`${API_URL}/api/incidents/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    victimId: userId,
                    type: 'SOS_ALERT',
                    location: {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        address: "Chat SOS Trigger"
                    }
                })
            });
            console.log("Global Chat SOS Incident logged.");

            // B. Send SMS to Guardians
            const isAvailable = await SMS.isAvailableAsync();
            if (isAvailable) {
                const cached = await AsyncStorage.getItem('cached_guardians');
                const local = await AsyncStorage.getItem('guardians');
                const guardians = JSON.parse(cached || local || '[]');
                const phones = guardians.map(g => g.phone);

                if (phones.length > 0) {
                    const mapLink = `https://www.google.com/maps/search/?api=1&query=${location.coords.latitude},${location.coords.longitude}`;
                    await SMS.sendSMSAsync(
                        phones,
                        `HELP! I am unsafe. Triggered from Chat. Here is my location: ${mapLink}`
                    );
                }
            }
        } catch (error) {
            console.log("Failed to send global alert from chat:", error);
        }
        // ------------------------------------------------------

        // 3. Live Tracking (30 mins default)
        startLiveTracking(30 * 60 * 1000, '30m');

        // 4. Audio Recording (30s auto-stop)
        await startRecording();

        // Auto-stop after 30s
        setTimeout(() => {
            if (recordingRef.current) {
                stopRecording();
                Alert.alert("SOS Evidence Sent", "30s Audio Recording shared.");
            }
        }, 30000);
    };

    const openLiveTracking = (location, messageId) => {
        navigation.navigate('LiveTracking', {
            contactId,
            contactName,
            initialLocation: location,
            messageId
        });
    };

    const renderMessage = ({ item }) => {
        const isMyMessage = item.sender === userId;
        const isLocation = item.type === 'location';
        const isAudio = item.type === 'audio';
        const isLive = item.content && item.content.includes("LIVE");

        return (
            <View style={[
                styles.messageWrapper,
                isMyMessage ? styles.myMessageWrapper : styles.theirMessageWrapper
            ]}>
                <View style={[
                    styles.bubble,
                    isMyMessage ? styles.myBubble : styles.theirBubble,
                    (isLocation || isAudio) && styles.locationBubble
                ]}>
                    {isAudio ? (
                        <AudioPlayer
                            audioUri={item.audioUrl}
                            duration={item.duration}
                            isMyMessage={isMyMessage}
                            timestamp={formatTime(item.timestamp)}
                        />
                    ) : isLocation ? (
                        isLive ? (
                            <LiveLocationCard
                                location={item.location}
                                timestamp={formatTime(item.timestamp)}
                                isRead={!item.isPending}
                                onPress={() => openLiveTracking(item.location, item._id)}
                            />
                        ) : (
                            <TouchableOpacity onPress={() => openMap(item.location.latitude, item.location.longitude)} style={styles.staticMapWidget}>
                                <View style={styles.staticMapIcon}>
                                    <Ionicons name="location-sharp" size={24} color={THEME.accent} />
                                </View>
                                <View style={styles.staticMapText}>
                                    <Text style={styles.staticMapTitle}>Shared Location</Text>
                                    <Text style={styles.staticMapCoords}>{item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}</Text>
                                </View>
                                <Feather name="external-link" size={16} color={THEME.textDim} />
                            </TouchableOpacity>
                        )
                    ) : (
                        <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.theirMessageText]}>
                            {item.content}
                        </Text>
                    )}

                    {/* Time & Tick inside bubble (absolute positioned for location cards to float on top) */
                    /* HIDE for Live Location and Audio because they handle it internally */}
                    {!isLive && !isAudio && (
                        <View style={[styles.metaRow, isLocation ? styles.metaRowOverlay : {}]}>
                            <Text style={[styles.timeText, isMyMessage || isLocation ? { color: 'rgba(255,255,255,0.7)' } : { color: THEME.textDim }]}>
                                {formatTime(item.timestamp)}
                            </Text>
                            {isMyMessage && (
                                <Ionicons
                                    name={item.isPending ? "time-outline" : "checkmark-done"}
                                    size={14}
                                    color={item.isPending ? 'rgba(255,255,255,0.7)' : (isLocation ? '#FFF' : THEME.text)}
                                    style={{ marginLeft: 4 }}
                                />
                            )}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={THEME.bg} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={28} color={THEME.text} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{contactName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerName}>{contactName}</Text>
                        <Text style={styles.headerStatus}>Online</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={handleCallPress} style={[styles.headerAction, { marginRight: 8 }]}>
                    <Ionicons name="call" size={22} color={THEME.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerAction}>
                    <Feather name="more-horizontal" size={24} color={THEME.text} />
                </TouchableOpacity>
            </View>

            {/* Chat Area & Input */}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "padding"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
                style={{ flex: 1 }}
            >
                <FlatList
                    ref={flatListRef}
                    data={[...messages].reverse()}
                    renderItem={renderMessage}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    inverted
                />

                <View style={styles.inputBarWrapper}>
                    {/* Plus Button for Attachments */}
                    <TouchableOpacity onPress={() => setShowAttachMenu(!showAttachMenu)} style={styles.attachBtn}>
                        <Feather name="plus" size={24} color={THEME.textDim} />
                    </TouchableOpacity>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            placeholderTextColor={THEME.textDim}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                        />
                    </View>

                    {inputText.trim() ? (
                        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} activeOpacity={0.8}>
                            <Ionicons name="paper-plane" size={20} color="#FFF" style={{ marginLeft: 2 }} />
                        </TouchableOpacity>
                    ) : (
                        <Pressable
                            onPressIn={startRecording}
                            onPressOut={stopRecording}
                            style={({ pressed }) => [
                                styles.sendBtn,
                                pressed && { opacity: 0.8 }
                            ]}
                        >
                            <Ionicons name="mic" size={24} color="#FFF" />
                        </Pressable>
                    )}
                </View>

                {/* Attachment Menu Overlay */}
                {showAttachMenu && (
                    <View style={styles.attachMenuContainer}>
                        <TouchableOpacity style={styles.menuItem} onPress={handleSOSBundle}>
                            <View style={[styles.menuIcon, { backgroundColor: THEME.danger }]}>
                                <MaterialCommunityIcons name="alert-octagram" size={24} color="#FFF" />
                            </View>
                            <Text style={[styles.menuLabel, { color: THEME.danger, fontWeight: 'bold' }]}>SOS ALERT</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => { setShowAttachMenu(false); handleShareLocation(); }}>
                            <View style={[styles.menuIcon, { backgroundColor: '#0F766E' }]}>
                                <Ionicons name="location" size={24} color="#FFF" />
                            </View>
                            <Text style={styles.menuLabel}>Location</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => { setShowAttachMenu(false); setShowDurationPicker(true); }}>
                            <View style={[styles.menuIcon, { backgroundColor: '#BE123C' }]}>
                                <MaterialCommunityIcons name="broadcast" size={24} color="#FFF" />
                            </View>
                            <Text style={styles.menuLabel}>Live Track</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Duration Picker Modal */}
                {showDurationPicker && (
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Select Duration</Text>
                            <TouchableOpacity style={styles.modalOption} onPress={() => startLiveTracking(15 * 60 * 1000, '15m')}>
                                <Text style={styles.modalOptionText}>15 Minutes</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalOption} onPress={() => startLiveTracking(60 * 60 * 1000, '1h')}>
                                <Text style={styles.modalOptionText}>1 Hour</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalOption} onPress={() => startLiveTracking(8 * 60 * 60 * 1000, '8h')}>
                                <Text style={styles.modalOptionText}>8 Hours</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalOptionCancel} onPress={() => setShowDurationPicker(false)}>
                                <Text style={styles.modalOptionTextCancel}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                {/* Call Option Modal */}
                {showCallPicker && (
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Make a Call</Text>
                            {isAgoraAvailable && (
                                <TouchableOpacity style={styles.modalOption} onPress={startVoIPCall}>
                                    <Text style={styles.modalOptionText}>Free App Call</Text>
                                    <Text style={styles.modalOptionSubtext}>Uses Wi-Fi / Data</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.modalOption} onPress={startCellularCall}>
                                <Text style={styles.modalOptionText}>Mobile Call</Text>
                                <Text style={styles.modalOptionSubtext}>Standard Carrier Rates</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalOptionCancel} onPress={() => setShowCallPicker(false)}>
                                <Text style={styles.modalOptionTextCancel}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Recording Overlay */}
                {isRecording && (
                    <View style={styles.recordingOverlay}>
                        <View style={styles.recordingContainer}>
                            <View style={styles.recordingWaveform}>
                                <View style={[styles.waveBar, { height: 20 }]} />
                                <View style={[styles.waveBar, { height: 35 }]} />
                                <View style={[styles.waveBar, { height: 25 }]} />
                                <View style={[styles.waveBar, { height: 40 }]} />
                                <View style={[styles.waveBar, { height: 30 }]} />
                            </View>
                            <Text style={styles.recordingDuration}>
                                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                            </Text>
                            <TouchableOpacity onPress={cancelRecording} style={styles.cancelRecordingBtn}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.recordingHint}>Release to send • Tap X to cancel</Text>
                    </View>
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.bg,
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 15,
        paddingBottom: 15,
        paddingHorizontal: 20,
        backgroundColor: THEME.header,
        zIndex: 10,
    },
    backBtn: {
        marginRight: 10,
        padding: 5,
        marginLeft: -10,
    },
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 16,
        backgroundColor: THEME.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#334155'
    },
    avatarText: {
        color: THEME.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerTextContainer: {
        justifyContent: 'center',
    },
    headerName: {
        color: THEME.text,
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    headerStatus: {
        color: THEME.accent,
        fontSize: 12,
        fontWeight: '500',
    },
    headerAction: {
        padding: 8,
        backgroundColor: THEME.surface,
        borderRadius: 12,
    },
    // List
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    messageWrapper: {
        marginBottom: 16,
        width: '100%',
        flexDirection: 'row',
    },
    myMessageWrapper: {
        justifyContent: 'flex-end',
    },
    theirMessageWrapper: {
        justifyContent: 'flex-start',
    },
    // Bubble
    bubble: {
        padding: 14,
        borderRadius: 20,
        maxWidth: '78%',
        minWidth: 100,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 4,
    },
    myBubble: {
        backgroundColor: THEME.primary,
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        backgroundColor: THEME.secondary,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 24,
    },
    myMessageText: {
        color: '#FFF',
    },
    theirMessageText: {
        color: THEME.text,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    metaRowOverlay: {
        position: 'absolute',
        bottom: 8,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        zIndex: 20,
    },
    timeText: {
        fontSize: 10,
        fontWeight: '500',
    },

    // =============================
    // NEW LIVE CARD STYLES
    // =============================
    locationBubble: {
        padding: 0,
        overflow: 'hidden',
        width: 280, // Slightly wider
        backgroundColor: 'transparent', // Let card handle bg
        shadowColor: 'transparent',
    },
    liveWidget: {
        width: '100%',
    },
    liveWidgetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#1E1E1E',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    liveRadarContainer: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    radarCore: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: THEME.danger,
    },
    radarRing: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: THEME.danger,
        opacity: 0.8,
    },
    radarRingOpac: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: THEME.danger,
        opacity: 0.3,
    },
    liveTextContent: {
        flex: 1,
    },
    liveTitle: {
        color: '#FFF',
        fontWeight: '900',
        fontSize: 13,
        letterSpacing: 0.5,
    },
    liveStatus: {
        color: THEME.danger,
        fontSize: 11,
        fontWeight: '600',
        marginTop: 1,
    },
    liveMapContainer: {
        height: 160,
        backgroundColor: '#0F172A',
        position: 'relative',
    },
    mapOverlayGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 40,
        backgroundColor: 'transparent',
    },
    liveFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: '#1E1E1E',
        borderTopWidth: 1,
        borderTopColor: '#2A2A2A',
    },
    liveFooterText: {
        color: '#CCC',
        fontSize: 12,
        fontWeight: '500',
    },
    liveFooterBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Static Map
    staticMapWidget: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: THEME.surface
    },
    staticMapIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    staticMapText: {
        flex: 1,
    },
    staticMapTitle: {
        color: THEME.text,
        fontWeight: 'bold',
        fontSize: 14,
    },
    staticMapCoords: {
        color: THEME.textDim,
        fontSize: 12,
    },
    attachBtn: {
        padding: 10,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: THEME.surface,
        borderRadius: 24,
    },
    // Attachment Menu Styles
    attachMenuContainer: {
        position: 'absolute',
        bottom: 80, // Above input bar
        left: 20,
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 16,
        width: 180,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#334155',
        flexDirection: 'column',
        gap: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuLabel: {
        color: THEME.text,
        fontSize: 16,
        fontWeight: '500',
    },
    // Modal
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
    },
    modalContent: {
        width: '80%',
        backgroundColor: THEME.surface,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
    },
    modalTitle: {
        color: THEME.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    modalOption: {
        width: '100%',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        alignItems: 'center',
    },
    modalOptionText: {
        color: THEME.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    modalOptionSubtext: {
        color: THEME.textDim,
        fontSize: 12,
        marginTop: 2,
    },
    modalOptionCancel: {
        marginTop: 15,
        paddingVertical: 10,
    },
    modalOptionTextCancel: {
        color: THEME.textDim,
        fontSize: 16,
    },


    // Input
    inputBarWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 15,
        paddingBottom: Platform.OS === 'ios' ? 0 : 15,
        paddingTop: 10,
        backgroundColor: THEME.bg,
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.surface,
        borderRadius: 25,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#334155',
        minHeight: 50,
    },
    input: {
        flex: 1,
        color: THEME.text,
        fontSize: 16,
        paddingVertical: 10,
        paddingHorizontal: 10,
        maxHeight: 100,
    },
    iconButton: {
        padding: 8,
    },
    sendBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: THEME.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },

    // Recording Overlay
    recordingOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: THEME.bg,
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: THEME.surface,
        zIndex: 100,
    },
    recordingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    recordingWaveform: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    waveBar: {
        width: 3,
        backgroundColor: THEME.danger,
        borderRadius: 2,
    },
    recordingDuration: {
        color: THEME.text,
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
    },
    cancelRecordingBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: THEME.danger,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordingHint: {
        color: THEME.textDim,
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
    },
});