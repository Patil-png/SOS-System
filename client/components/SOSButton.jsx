import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, Dimensions, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const BUTTON_SIZE = width * 0.7;
const DURATION = 3000;

export default function SOSButton({ onTrigger }) {
    const [isPressing, setIsPressing] = useState(false);
    const scale = useRef(new Animated.Value(1)).current;
    const progress = useRef(new Animated.Value(0)).current;
    const timerRef = useRef(null);

    const handlePressIn = () => {
        setIsPressing(true);

        // Scale down effect
        Animated.timing(scale, {
            toValue: 0.95,
            duration: 100,
            useNativeDriver: true,
        }).start();

        // Haptics loop
        let hapticCount = 0;
        const hapticInterval = setInterval(() => {
            hapticCount++;
            if (hapticCount < 10) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } else if (hapticCount < 20) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
        }, 300);

        timerRef.current = { interval: hapticInterval };

        // Start progress animation
        Animated.timing(progress, {
            toValue: 1,
            duration: DURATION,
            easing: Easing.linear,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                triggerEmergency();
            }
        });
    };

    const handlePressOut = () => {
        setIsPressing(false);

        // Reset Scale
        Animated.timing(scale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
        }).start();

        // Cancel Haptics
        if (timerRef.current) {
            clearInterval(timerRef.current.interval);
            timerRef.current = null;
        }

        // Reset Progress
        progress.stopAnimation();
        progress.setValue(0);
    };

    const triggerEmergency = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); // Distinct vibration
        if (timerRef.current) {
            clearInterval(timerRef.current.interval);
            timerRef.current = null;
        }
        onTrigger();
        setIsPressing(false);
        progress.setValue(0);
    };

    // Interpolate progress to scale up the background circle
    const progressScale = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1], // Start from 0 scale to 1 (full size)
    });

    return (
        <View style={styles.container}>
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.buttonContainer}
            >
                <Animated.View style={[styles.button, { transform: [{ scale }] }]}>
                    <LinearGradient
                        colors={['#ff4b4b', '#ff0000']}
                        style={styles.gradient}
                    >
                        {/* Background filling up */}
                        <Animated.View
                            style={[
                                StyleSheet.absoluteFill,
                                styles.progressFill,
                                {
                                    opacity: progress,
                                    transform: [{ scale: progressScale }]
                                }
                            ]}
                        />

                        <Text style={styles.text}>SOS</Text>
                        {isPressing && <Text style={styles.subText}>Hold for 3s</Text>}
                    </LinearGradient>
                </Animated.View>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonContainer: {
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: BUTTON_SIZE / 2,
        elevation: 10,
        shadowColor: '#ff0000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    button: {
        width: '100%',
        height: '100%',
        borderRadius: BUTTON_SIZE / 2,
        overflow: 'hidden',
    },
    gradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BUTTON_SIZE / 2,
        borderWidth: 4,
        borderColor: '#fff',
    },
    progressFill: {
        backgroundColor: 'rgba(0, 0, 0, 0.2)', // Darken as it fills
        borderRadius: BUTTON_SIZE / 2,
    },
    text: {
        color: '#fff',
        fontSize: 48,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    subText: {
        color: '#fff',
        fontSize: 14,
        marginTop: 10,
        fontWeight: '600',
    }
});
