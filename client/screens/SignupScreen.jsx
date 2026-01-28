import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Alert,
    TouchableOpacity,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Easing,
    ScrollView,
    Text as RNText
} from 'react-native';
import { TextInput, ActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

// Config
import { BASE_URL } from '../config';
const API_URL = `${BASE_URL}/register`;

// TACTICAL PALETTE
const COLORS = {
    bg: '#000000',
    card: '#1C1C1E',
    primary: '#FF453A',
    text: '#FFFFFF',
    textDim: '#8E8E93',
    success: '#32D74B',
    border: '#333333'
};

export default function SignupScreen({ navigation, onLogin }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [guardianName, setGuardianName] = useState('');
    const [guardianPhone, setGuardianPhone] = useState('');
    const [loading, setLoading] = useState(false);

    // Animation for the "Radar"
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1, // Subtle pulse
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

    const handleRegister = async () => {
        if (!name || !phone || !guardianName || !guardianPhone) {
            Alert.alert('Protocol Error', 'All fields are mandatory for registration.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, guardianName, guardianPhone }),
            });

            const data = await response.json();

            if (response.ok) {
                await AsyncStorage.setItem('userId', data.userId);
                await AsyncStorage.setItem('userName', name);
                onLogin();
            } else {
                Alert.alert('Registration Denied', data.error || 'System error.');
            }
        } catch (error) {
            Alert.alert('Network Down', 'Cannot reach command server.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            {/* Top Status Bar */}
            <View style={styles.statusBar}>
                <View style={styles.statusIndicator}>
                    <View style={styles.statusDot} />
                    <RNText style={styles.statusText}>ENCRYPTION ACTIVE</RNText>
                </View>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="close" size={24} color={COLORS.textDim} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.radarContainer}>
                            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
                            <View style={styles.logoCircle}>
                                <MaterialCommunityIcons name="shield-account" size={36} color={COLORS.primary} />
                            </View>
                        </View>
                        <RNText style={styles.title}>NEW IDENTITY</RNText>
                        <RNText style={styles.subtitle}>Create your secure profile</RNText>
                    </View>

                    {/* SECTION 1: USER INFO */}
                    <View style={styles.sectionContainer}>
                        <RNText style={styles.sectionLabel}>// PERSONAL DETAILS</RNText>

                        {/* Name Input */}
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="account-outline" size={20} color={COLORS.textDim} style={styles.icon} />
                            <TextInput
                                placeholder="Full Name"
                                placeholderTextColor={COLORS.textDim}
                                value={name}
                                onChangeText={setName}
                                style={styles.input}
                                textColor={COLORS.text}
                                activeUnderlineColor="transparent"
                                underlineColor="transparent"
                            />
                        </View>

                        {/* Phone Input */}
                        <View style={styles.inputWrapper}>
                            <View style={styles.countryCode}>
                                <RNText style={{ color: '#fff', fontWeight: 'bold' }}>+91</RNText>
                            </View>
                            <TextInput
                                placeholder="Mobile Number"
                                placeholderTextColor={COLORS.textDim}
                                keyboardType="phone-pad"
                                value={phone}
                                onChangeText={setPhone}
                                style={styles.input}
                                textColor={COLORS.text}
                                activeUnderlineColor="transparent"
                                underlineColor="transparent"
                            />
                        </View>
                    </View>

                    {/* SECTION 2: GUARDIAN INFO */}
                    <View style={styles.sectionContainer}>
                        <RNText style={styles.sectionLabel}>// EMERGENCY CONTACT (GUARDIAN)</RNText>

                        {/* Guardian Name */}
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="shield-star-outline" size={20} color={COLORS.textDim} style={styles.icon} />
                            <TextInput
                                placeholder="Guardian Name"
                                placeholderTextColor={COLORS.textDim}
                                value={guardianName}
                                onChangeText={setGuardianName}
                                style={styles.input}
                                textColor={COLORS.text}
                                activeUnderlineColor="transparent"
                                underlineColor="transparent"
                            />
                        </View>

                        {/* Guardian Phone */}
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="phone-alert-outline" size={20} color={COLORS.textDim} style={styles.icon} />
                            <TextInput
                                placeholder="Guardian Phone"
                                placeholderTextColor={COLORS.textDim}
                                keyboardType="phone-pad"
                                value={guardianPhone}
                                onChangeText={setGuardianPhone}
                                style={styles.input}
                                textColor={COLORS.text}
                                activeUnderlineColor="transparent"
                                underlineColor="transparent"
                            />
                        </View>
                    </View>

                    {/* Disclaimer */}
                    <RNText style={styles.disclaimer}>
                        <FontAwesome5 name="check-circle" size={10} color={COLORS.success} />  Profile will be linked to national safety grid.
                    </RNText>

                    {/* Action Button */}
                    <TouchableOpacity
                        onPress={handleRegister}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={loading ? ['#333', '#333'] : [COLORS.primary, '#990000']}
                            style={styles.registerButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <RNText style={styles.btnText}>ESTABLISH CONNECTION</RNText>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Footer Link */}
                    <View style={styles.footer}>
                        <RNText style={styles.footerText}>Existing User? </RNText>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <RNText style={styles.link}>ACCESS TERMINAL</RNText>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
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
        marginBottom: 20,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.success,
        marginRight: 6,
    },
    statusText: {
        color: COLORS.success,
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    scrollContent: {
        paddingHorizontal: 25,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    radarContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        height: 80,
        width: 80,
    },
    pulseRing: {
        position: 'absolute',
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 69, 58, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 69, 58, 0.3)',
    },
    logoCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#1a0505',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    title: {
        fontSize: 24,
        color: COLORS.text,
        letterSpacing: 2,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    subtitle: {
        color: COLORS.textDim,
        fontSize: 12,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    sectionContainer: {
        marginBottom: 25,
    },
    sectionLabel: {
        color: COLORS.primary,
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 10,
        opacity: 0.8,
    },
    inputWrapper: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        borderRadius: 8,
        height: 55,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 12,
        overflow: 'hidden'
    },
    icon: {
        marginLeft: 15,
        marginRight: 5,
    },
    countryCode: {
        width: 50,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: COLORS.border,
        backgroundColor: '#252525',
    },
    input: {
        flex: 1,
        backgroundColor: 'transparent',
        fontSize: 16,
        height: 55,
        paddingHorizontal: 5,
    },
    disclaimer: {
        color: COLORS.textDim,
        fontSize: 10,
        textAlign: 'center',
        marginBottom: 20,
    },
    registerButton: {
        height: 55,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    btnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 25,
        alignItems: 'center',
    },
    footerText: {
        color: COLORS.textDim,
        fontSize: 14,
    },
    link: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 0.5,
    }
});