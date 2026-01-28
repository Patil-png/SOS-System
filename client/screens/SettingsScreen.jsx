import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Text,
    Switch,
    Dimensions,
    StatusBar,
    TextInput,
    Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../context/SettingsContext';

const { width } = Dimensions.get('window');

// Enhanced Dark Theme Palette
const THEME = {
    bg: '#020617',            // Darker, richer background
    cardBg: '#1E293B',        // Base card color
    cardBorder: '#334155',    // Subtle border for glass effect
    primary: '#6366F1',       // Indigo 500
    primaryGlow: 'rgba(99, 102, 241, 0.3)',
    accent: '#38BDF8',        // Sky Blue
    danger: '#F43F5E',        // Rose 500
    text: '#F1F5F9',          // Slate 100
    textDim: '#94A3B8',       // Slate 400
    iconBg: 'rgba(99, 102, 241, 0.15)',
    inputBg: '#0F172A',
};

export default function SettingsScreen({ navigation }) {
    const { settings, updateSetting } = useSettings();
    const { shakeSensitivity, radius, safeWord, isStealth, shakeEnabled } = settings;

    const _handleLogout = async () => {
        await AsyncStorage.clear();
        alert("Logged out. Restart app.");
    };

    const SettingSection = ({ title, children }) => (
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.cardContainer}>
                {/* Subtle gradient overlay for the card */}
                <LinearGradient
                    colors={['rgba(30, 41, 59, 0.7)', 'rgba(30, 41, 59, 1)']}
                    style={StyleSheet.absoluteFill}
                />
                {children}
            </View>
        </View>
    );

    const SettingItem = ({ icon, title, description, right, subContent, isLast }) => (
        <View style={[styles.itemWrapper, !isLast && styles.itemSeparator]}>
            <View style={styles.itemContainer}>
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={20} color={THEME.primary} />
                </View>
                <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{title}</Text>
                    {description && <Text style={styles.itemDescription}>{description}</Text>}
                </View>
                {right && <View style={styles.itemRight}>{right}</View>}
            </View>
            {subContent && <View style={styles.subContent}>{subContent}</View>}
        </View>
    );

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" backgroundColor={THEME.bg} />

            {/* Background Gradient */}
            <LinearGradient
                colors={[THEME.bg, '#0F172A', '#1E1B4B']} // Deep blue/purple fade
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <View style={styles.header}>
                    <View style={styles.headerIconRing}>
                        <MaterialCommunityIcons name="shield-account-outline" size={32} color={THEME.accent} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Settings</Text>
                        <Text style={styles.headerSubtitle}>Configure your Guardian Shield</Text>
                    </View>
                </View>

                {/* Safety Features Section */}
                <SettingSection title="Detection & Alerts">
                    <SettingItem
                        icon="pulse"
                        title="Shake Sensitivity"
                        description={`Force Threshold: ${shakeSensitivity.toFixed(2)}g`}
                        subContent={
                            <View style={styles.sliderWrapper}>
                                <View style={styles.sliderLabels}>
                                    <Text style={styles.sliderLabel}>Sensitive (1.2g)</Text>
                                    <Text style={styles.sliderLabel}>Hard (3.0g)</Text>
                                </View>
                                <Slider
                                    style={styles.slider}
                                    minimumValue={1.2}
                                    maximumValue={3.0}
                                    value={shakeSensitivity}
                                    onSlidingComplete={(val) => updateSetting('shakeSensitivity', val)}
                                    minimumTrackTintColor={THEME.primary}
                                    maximumTrackTintColor={THEME.cardBorder}
                                    thumbTintColor={THEME.text}
                                />
                            </View>
                        }
                    />

                    <SettingItem
                        icon="navigate-circle-outline"
                        title="Geofence Radius"
                        description={`Trigger Alert Deviation: ${radius}m`}
                        subContent={
                            <View style={styles.sliderWrapper}>
                                <View style={styles.sliderLabels}>
                                    <Text style={styles.sliderLabel}>50m</Text>
                                    <Text style={styles.sliderLabel}>{radius}m</Text>
                                    <Text style={styles.sliderLabel}>500m</Text>
                                </View>
                                <Slider
                                    style={styles.slider}
                                    minimumValue={50}
                                    maximumValue={500}
                                    step={50}
                                    value={radius}
                                    onSlidingComplete={(val) => updateSetting('radius', val)}
                                    minimumTrackTintColor={THEME.accent}
                                    maximumTrackTintColor={THEME.cardBorder}
                                    thumbTintColor={THEME.text}
                                />
                            </View>
                        }
                    />

                    <SettingItem
                        icon="key-outline"
                        title="Safe Word"
                        description="Voice command to cancel SOS"
                        subContent={
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 'Password'"
                                    placeholderTextColor={THEME.textDim}
                                    value={safeWord}
                                    onChangeText={(t) => updateSetting('safeWord', t)}
                                    autoCapitalize="none"
                                />
                                <View style={styles.inputBadge}>
                                    <Ionicons name="mic-outline" size={14} color={THEME.textDim} />
                                </View>
                            </View>
                        }
                    />

                    <SettingItem
                        icon="flash-outline"
                        title="Shake to Alert"
                        description="Instant SOS when device shaken"
                        isLast={true}
                        right={
                            <Switch
                                value={shakeEnabled}
                                onValueChange={(val) => updateSetting('shakeEnabled', val)}
                                trackColor={{ false: '#334155', true: THEME.primary }}
                                thumbColor="#FFF"
                                ios_backgroundColor="#334155"
                            />
                        }
                    />
                </SettingSection>

                {/* Privacy & App Section */}
                <SettingSection title="Privacy & System">
                    <SettingItem
                        icon="eye-off-outline"
                        title="Stealth Mode"
                        description="Disguise app UI as Calculator"
                        right={
                            <Switch
                                value={isStealth}
                                onValueChange={(val) => updateSetting('isStealth', val)}
                                trackColor={{ false: '#334155', true: THEME.accent }}
                                thumbColor="#FFF"
                                ios_backgroundColor="#334155"
                            />
                        }
                    />

                    <SettingItem
                        icon="battery-charging-outline"
                        title="Low Battery Alert"
                        description="Auto-notify contacts at < 15%"
                        isLast={true}
                        right={
                            <Switch
                                value={true}
                                trackColor={{ false: '#334155', true: THEME.danger }}
                                thumbColor="#FFF"
                                ios_backgroundColor="#334155"
                            />
                        }
                    />
                </SettingSection>

                {/* Account Section */}
                <View style={styles.footerSection}>
                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={_handleLogout}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={['#EF4444', '#DC2626']} // Red gradient
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.logoutGradient}
                        >
                            <Ionicons name="log-out-outline" size={20} color="#FFF" />
                            <Text style={styles.logoutText}>Sign Out</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.versionInfo}>
                        <Text style={styles.versionText}>Guardian Shield v1.2.0</Text>
                        <Text style={styles.footerNote}>Secure Connection Active • Encrypted</Text>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: THEME.bg,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 40,
        paddingHorizontal: 20,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 35,
    },
    headerIconRing: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.2)',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: THEME.text,
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: THEME.textDim,
        marginTop: 2,
    },

    // Sections & Cards
    sectionContainer: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: THEME.textDim,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 10,
        marginLeft: 4,
    },
    cardContainer: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: THEME.cardBorder,
        backgroundColor: THEME.cardBg,
    },

    // Items
    itemWrapper: {
        padding: 16,
    },
    itemSeparator: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(51, 65, 85, 0.5)', // Very subtle divider
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: THEME.iconBg,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    itemContent: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME.text,
        marginBottom: 2,
    },
    itemDescription: {
        fontSize: 12,
        color: THEME.textDim,
        lineHeight: 16,
    },
    itemRight: {
        marginLeft: 10,
    },

    // Sub Content (Sliders/Inputs)
    subContent: {
        marginTop: 15,
        paddingLeft: 52, // Indent to align with text, not icon
    },
    sliderWrapper: {
        width: '100%',
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
        paddingHorizontal: 2,
    },
    sliderLabel: {
        fontSize: 11,
        color: THEME.textDim,
        fontWeight: '500',
    },
    slider: {
        height: 30,
        width: '100%',
    },

    // Input Styling
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.inputBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: THEME.cardBorder,
        height: 46,
        paddingHorizontal: 12,
    },
    input: {
        flex: 1,
        color: THEME.text,
        fontSize: 15,
        fontWeight: '500',
    },
    inputBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
    },

    // Footer & Logout
    footerSection: {
        marginTop: 10,
        marginBottom: 20,
    },
    logoutBtn: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: THEME.danger,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    logoutGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    logoutText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    versionInfo: {
        alignItems: 'center',
    },
    versionText: {
        color: THEME.textDim,
        fontSize: 13,
        fontWeight: '600',
    },
    footerNote: {
        color: '#475569',
        fontSize: 11,
        marginTop: 4,
    },
});