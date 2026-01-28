import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    Vibration
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const THEME = {
    bg: '#020617',
    danger: '#F43F5E',
    text: '#F1F5F9',
    textDim: '#94A3B8',
    inputBg: '#0F172A',
    cardBorder: '#334155',
};

export default function SafeWordLockScreen({ safeWord, onUnlock, countdownSeconds }) {
    const [input, setInput] = useState('');
    const [error, setError] = useState('');
    const [attempts, setAttempts] = useState(0);

    const isCountdownActive = countdownSeconds !== null && countdownSeconds > 0;

    const handleUnlock = () => {
        if (input.trim().toLowerCase() === safeWord.toLowerCase()) {
            onUnlock();
        } else {
            setError('Incorrect safe word');
            setAttempts(prev => prev + 1);
            Vibration.vibrate([0, 100, 100, 100]);
            setInput('');

            // Clear error after 2 seconds
            setTimeout(() => setError(''), 2000);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={THEME.bg} />

            {/* Background Gradient */}
            <LinearGradient
                colors={['#020617', '#1E1B4B', '#7C2D12']}
                style={StyleSheet.absoluteFill}
            />

            {/* Blur Overlay */}
            <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                {/* Alert Icon */}
                <View style={styles.iconContainer}>
                    <View style={styles.iconRing}>
                        <Ionicons name="alert-circle" size={80} color={THEME.danger} />
                    </View>
                    <View style={styles.pulse} />
                </View>

                {/* Title */}
                {isCountdownActive ? (
                    <>
                        <Text style={styles.countdownTitle}>SOS ACTIVATING IN</Text>
                        <Text style={styles.countdownTimer}>{countdownSeconds}</Text>
                        <Text style={styles.countdownSubtitle}>Enter Safe Word to CANCEL Alert</Text>
                    </>
                ) : (
                    <>
                        <Text style={styles.title}>🚨 DANGER ALERT ACTIVE</Text>
                        <Text style={styles.subtitle}>Siren is playing. Enter safe word to unlock.</Text>
                    </>
                )}

                {/* Input */}
                <View style={styles.inputWrapper}>
                    <View style={styles.inputContainer}>
                        <Ionicons name="key" size={20} color={THEME.textDim} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter safe word"
                            placeholderTextColor={THEME.textDim}
                            value={input}
                            onChangeText={(text) => {
                                setInput(text);
                                setError('');
                            }}
                            onSubmitEditing={handleUnlock}
                            autoCapitalize="none"
                            autoFocus
                            secureTextEntry
                        />
                    </View>

                    {error && (
                        <View style={styles.errorContainer}>
                            <Ionicons name="close-circle" size={16} color={THEME.danger} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}
                </View>

                {/* Unlock Button */}
                <TouchableOpacity
                    style={[styles.unlockButton, isCountdownActive ? styles.cancelButton : null]}
                    onPress={handleUnlock}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={isCountdownActive ? ['#10B981', '#059669'] : ['#6366F1', '#4F46E5']}
                        style={styles.unlockGradient}
                    >
                        <Ionicons name={isCountdownActive ? "shield-checkmark" : "lock-open"} size={20} color="#FFF" />
                        <Text style={styles.unlockText}>
                            {isCountdownActive ? "I AM SAFE" : "Unlock & Stop Siren"}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Attempts Counter */}
                {attempts > 0 && (
                    <Text style={styles.attemptsText}>
                        Failed attempts: {attempts}
                    </Text>
                )}

                {/* Warning */}
                <View style={styles.warningBox}>
                    <Ionicons name="information-circle-outline" size={18} color={THEME.textDim} />
                    <Text style={styles.warningText}>
                        Your guardians have been notified
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.bg,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },

    // Icon
    iconContainer: {
        marginBottom: 30,
        position: 'relative',
    },
    iconRing: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(244, 63, 94, 0.3)',
    },
    pulse: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(244, 63, 94, 0.2)',
        opacity: 0.5,
    },

    // Text
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: THEME.text,
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 15,
        color: THEME.textDim,
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 22,
    },
    countdownTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#EF4444',
        marginBottom: 5,
        textAlign: 'center',
        letterSpacing: 2,
    },
    countdownTimer: {
        fontSize: 80,
        fontWeight: '900',
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 10,
        textShadowColor: 'rgba(239, 68, 68, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
    },
    countdownSubtitle: {
        fontSize: 16,
        color: '#E5E7EB',
        textAlign: 'center',
        marginBottom: 40,
        fontWeight: '600',
    },
    cancelButton: {
        shadowColor: "#10B981",
    },

    // Input
    inputWrapper: {
        width: '100%',
        marginBottom: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.inputBg,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: THEME.cardBorder,
        height: 56,
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: THEME.text,
        fontSize: 16,
        fontWeight: '500',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        paddingHorizontal: 4,
    },
    errorText: {
        color: THEME.danger,
        fontSize: 14,
        marginLeft: 6,
        fontWeight: '500',
    },

    // Button
    unlockButton: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    unlockGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 10,
    },
    unlockText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.5,
    },

    // Footer
    attemptsText: {
        color: THEME.danger,
        fontSize: 13,
        marginBottom: 20,
        fontWeight: '600',
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    warningText: {
        color: THEME.textDim,
        fontSize: 13,
        fontWeight: '500',
    },
});
