import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated, Easing } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const AudioPlayer = ({ audioUri, duration, isMyMessage, timestamp }) => {
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [audioDuration, setAudioDuration] = useState(duration ? duration * 1000 : 0);

    // Animation value for the bounce effect
    const waveAnim = useRef(new Animated.Value(0)).current;

    // Generate static random heights for bars once so they don't jitter on re-render
    const barHeights = useMemo(() => Array.from({ length: 24 }).map(() => 8 + Math.random() * 14), []);

    useEffect(() => {
        if (isPlaying) {
            // Start the bouncing animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(waveAnim, {
                        toValue: 1,
                        duration: 400,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                    Animated.timing(waveAnim, {
                        toValue: 0,
                        duration: 400,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            // Stop and reset smoothly
            waveAnim.stopAnimation();
            Animated.timing(waveAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [isPlaying]);

    useEffect(() => {
        return sound
            ? () => { sound.unloadAsync(); }
            : undefined;
    }, [sound]);

    const playPauseAudio = async () => {
        try {
            if (!audioUri) return Alert.alert('Error', 'Audio file unavailable');

            if (sound) {
                if (isPlaying) {
                    await sound.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await sound.playAsync();
                    setIsPlaying(true);
                }
            } else {
                const { sound: newSound, status } = await Audio.Sound.createAsync(
                    { uri: audioUri },
                    { shouldPlay: true },
                    onPlaybackStatusUpdate
                );
                setSound(newSound);
                setIsPlaying(true);
                if (!audioDuration && status.durationMillis) {
                    setAudioDuration(status.durationMillis);
                }
            }
        } catch (error) {
            console.error('Playback Error:', error);
        }
    };

    const onPlaybackStatusUpdate = (status) => {
        if (status.isLoaded) {
            setPosition(status.positionMillis);
            if (status.durationMillis) setAudioDuration(status.durationMillis);
            if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
                sound?.setPositionAsync(0);
            }
        }
    };

    const formatTime = (millis) => {
        if (!millis) return "0:00";
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Calculate current progress (0 to 1)
    const currentProgress = audioDuration > 0 ? position / audioDuration : 0;

    const renderWaveform = () => {
        return (
            <View style={styles.waveformRow}>
                {barHeights.map((height, index) => {
                    // Determine if this bar is "played" (active color) or "unplayed" (dim color)
                    const isPlayed = (index / barHeights.length) <= currentProgress;

                    // Animation: Only scale up if playing
                    const scaleY = waveAnim.interpolate({
                        inputRange: [0, 1],
                        // Even indices bounce more than odd for a natural look
                        outputRange: [1, index % 2 === 0 ? 1.6 : 1.3]
                    });

                    // Define colors based on Message Owner + Played Status
                    let barColor;
                    if (isMyMessage) {
                        barColor = isPlayed ? '#FFFFFF' : 'rgba(255,255,255,0.4)';
                    } else {
                        barColor = isPlayed ? '#6366F1' : '#CBD5E1';
                    }

                    return (
                        <Animated.View
                            key={index}
                            style={[
                                styles.waveBar,
                                {
                                    height,
                                    backgroundColor: barColor,
                                    transform: isPlaying ? [{ scaleY }] : []
                                }
                            ]}
                        />
                    );
                })}
            </View>
        );
    };

    const THEME = {
        playBtnBg: isMyMessage ? 'rgba(255,255,255,0.2)' : 'rgba(99, 102, 241, 0.1)',
        playBtnIcon: isMyMessage ? '#FFFFFF' : '#6366F1',
        textColor: isMyMessage ? '#FFFFFF' : '#64748B'
    };

    const Content = () => (
        <View style={styles.innerContent}>
            {/* Play Button */}
            <TouchableOpacity
                onPress={playPauseAudio}
                style={[styles.playButton, { backgroundColor: THEME.playBtnBg }]}
                activeOpacity={0.7}
            >
                <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={20}
                    color={THEME.playBtnIcon}
                    style={{ marginLeft: isPlaying ? 0 : 2 }}
                />
            </TouchableOpacity>

            {/* Waveform Visualization */}
            {renderWaveform()}

            {/* Timer */}
            <Text style={[styles.timerText, { color: THEME.textColor }]}>
                {isPlaying ? formatTime(position) : formatTime(audioDuration)}
            </Text>
        </View>
    );

    return (
        <View style={styles.wrapper}>
            {isMyMessage ? (
                <LinearGradient
                    colors={['#6366F1', '#4F46E5']} // Vibrant Indigo Gradient
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.container, styles.myMessageShadow]}
                >
                    <Content />
                </LinearGradient>
            ) : (
                <View style={[styles.container, styles.theirMessageContainer]}>
                    <Content />
                </View>
            )}

            {/* Optional Timestamp below the bubble */}
            {timestamp && (
                <Text style={[
                    styles.timestamp,
                    { alignSelf: isMyMessage ? 'flex-end' : 'flex-start' }
                ]}>
                    {timestamp}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 8,
        maxWidth: 300,
    },
    container: {
        borderRadius: 24, // High border radius for Pill shape
        padding: 6,
        paddingHorizontal: 8,
        justifyContent: 'center',
        height: 54, // Fixed height for consistency
        minWidth: 220,
    },
    myMessageShadow: {
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    theirMessageContainer: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    innerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    playButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    waveformRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        marginHorizontal: 10,
        gap: 2, // Space between bars
    },
    waveBar: {
        width: 3,
        borderRadius: 1.5,
        minHeight: 4,
    },
    timerText: {
        fontSize: 12,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
        minWidth: 35,
        textAlign: 'right',
        marginRight: 4,
    },
    timestamp: {
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 4,
        marginHorizontal: 4,
    }
});

export default AudioPlayer;