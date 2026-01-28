import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Alert,
    TouchableOpacity,
    StatusBar,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Easing,
    Text as RNText
} from 'react-native';
import { TextInput, ActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

import { BASE_URL } from '../config';
const API_URL = `${BASE_URL}/login`;
const { width } = Dimensions.get('window');

// PROFESSIONAL SOS PALETTE
const COLORS = {
    bg: '#000000',        // Pure Black
    card: '#1C1C1E',      // iOS Dark System Grey
    primary: '#FF453A',   // Tactical Red (High Visibility)
    text: '#FFFFFF',
    textDim: '#8E8E93',
    success: '#32D74B',   // Status Green
};

export default function LoginScreen({ navigation, onLogin }) {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    // Animation Values
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // "Radar Pulse" Animation Effect
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const handleLogin = async () => {
        if (!phone) {
            Alert.alert('Missing Info', 'Enter mobile number to authenticate.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });

            const data = await response.json();

            if (response.ok) {
                await AsyncStorage.setItem('userId', data.userId);
                await AsyncStorage.setItem('userName', data.name);
                onLogin();
            } else {
                Alert.alert('Access Denied', data.error || 'Invalid credentials');
            }
        } catch (error) {
            Alert.alert('Connection Lost', 'Server unreachable. Check internet.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            {/* Top Status Bar (Like a Security System) */}
            <View style={styles.statusBar}>
                <View style={styles.statusIndicator}>
                    <View style={styles.statusDot} />
                    <RNText style={styles.statusText}>SYSTEM SECURE • ONLINE</RNText>
                </View>
                <MaterialCommunityIcons name="wifi" size={16} color={COLORS.textDim} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.content}
            >
                {/* Visual Header */}
                <View style={styles.header}>
                    <View style={styles.radarContainer}>
                        {/* Animated Pulse Ring */}
                        <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />

                        <View style={styles.logoCircle}>
                            <MaterialCommunityIcons name="alert-decagram" size={42} color={COLORS.primary} />
                        </View>
                    </View>

                    <RNText style={styles.appName}>RAPID<RNText style={styles.appNameBold}>RESPONSE</RNText></RNText>
                    <RNText style={styles.instruction}>Authenticate Device</RNText>
                </View>

                {/* Input Section */}
                <View style={styles.formContainer}>
                    <View style={styles.inputWrapper}>
                        <View style={styles.countryCode}>
                            <RNText style={styles.flag}>🇮🇳</RNText>
                            <RNText style={styles.codeText}>+91</RNText>
                        </View>
                        <TextInput
                            mode="flat"
                            placeholder="Mobile Number"
                            placeholderTextColor={COLORS.textDim}
                            keyboardType="number-pad"
                            value={phone}
                            onChangeText={setPhone}
                            style={styles.input}
                            textColor={COLORS.text}
                            underlineColor="transparent"
                            activeUnderlineColor="transparent"
                            selectionColor={COLORS.primary}
                            theme={{ colors: { onSurfaceVariant: COLORS.textDim } }}
                        />
                    </View>

                    {/* Disclaimer */}
                    <RNText style={styles.disclaimer}>
                        <FontAwesome5 name="lock" size={10} color={COLORS.textDim} />  256-bit Encrypted Connection
                    </RNText>

                    {/* Tactical Button */}
                    <TouchableOpacity
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={loading ? ['#333', '#333'] : [COLORS.primary, '#D50000']}
                            style={styles.loginButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <RNText style={styles.btnText}>INITIATE LOGIN</RNText>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Register Link */}
                    <TouchableOpacity
                        style={styles.registerContainer}
                        onPress={() => navigation.navigate('Signup')}
                    >
                        <RNText style={styles.registerText}>New Device? <RNText style={styles.registerLink}>Register ID</RNText></RNText>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    statusBar: {
        marginTop: Platform.OS === 'android' ? 10 : 50,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        opacity: 0.7
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#333'
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.success,
        marginRight: 8,
    },
    statusText: {
        color: COLORS.success,
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 25,
    },
    header: {
        alignItems: 'center',
        marginBottom: 50,
    },
    radarContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        height: 120,
        width: 120,
    },
    pulseRing: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 69, 58, 0.2)', // Red glow
        borderWidth: 1,
        borderColor: 'rgba(255, 69, 58, 0.5)',
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#1a0505', // Very dark red bg
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 15,
        elevation: 10,
    },
    appName: {
        fontSize: 28,
        color: COLORS.text,
        letterSpacing: 2,
        fontWeight: '300',
    },
    appNameBold: {
        fontWeight: '900',
        color: COLORS.text,
    },
    instruction: {
        color: COLORS.textDim,
        fontSize: 14,
        marginTop: 5,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    formContainer: {
        width: '100%',
    },
    inputWrapper: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        height: 60,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 10,
        overflow: 'hidden'
    },
    countryCode: {
        width: 80,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#333',
        backgroundColor: '#252525',
        flexDirection: 'row',
    },
    flag: {
        fontSize: 18,
        marginRight: 5
    },
    codeText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },
    input: {
        flex: 1,
        backgroundColor: 'transparent',
        fontSize: 18,
        height: 60,
        paddingHorizontal: 10,
    },
    disclaimer: {
        color: '#555',
        fontSize: 11,
        textAlign: 'center',
        marginBottom: 25,
        marginTop: 5,
    },
    loginButton: {
        height: 56,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    btnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    registerContainer: {
        marginTop: 25,
        alignItems: 'center',
    },
    registerText: {
        color: COLORS.textDim,
        fontSize: 14,
    },
    registerLink: {
        color: COLORS.primary,
        fontWeight: 'bold',
    }
});