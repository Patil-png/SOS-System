import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform } from 'react-native';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LiveMapBubble from './LiveMapBubble';

// Adapted from User Snippet
const LiveLocationCard = ({ location, timestamp, isRead, onPress, status = "Session Active" }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [pulseAnim]);

    return (
        <View style={styles.cardContainer}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Animated.View style={[styles.pulseIconContainer, { transform: [{ scale: pulseAnim }] }]}>
                        <MaterialIcons name="my-location" size={20} color="#FF3B30" />
                    </Animated.View>
                    <View>
                        <Text style={styles.headerTitle}>LIVE TRACKING</Text>
                        <Text style={styles.headerSubtitle}>{status}</Text>
                    </View>
                </View>
                <Ionicons name="radio-outline" size={20} color="#FF3B30" style={styles.headerRightIcon} />
            </View>

            {/* Map View */}
            <View style={styles.mapContainer}>
                {/* Using LiveMapBubble (Leaflet) instead of Google Maps to avoid API Key issues */}
                <LiveMapBubble latitude={location.latitude} longitude={location.longitude} />

                {/* Gradient Overlay for style */}
                <LinearGradient
                    colors={['transparent', 'rgba(26, 34, 48, 0.8)']}
                    style={styles.mapOverlay}
                    pointerEvents="none"
                />
            </View>

            {/* Footer */}
            <TouchableOpacity style={styles.footer} onPress={onPress}>
                <Text style={styles.footerText}>Tap to open full map</Text>
                <View style={styles.metaContainer}>
                    <Text style={styles.timestamp}>{timestamp}</Text>
                    <Ionicons
                        name="checkmark-done"
                        size={16}
                        color={isRead ? "#34B7F1" : "#aaa"}
                        style={styles.checkIcon}
                    />
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: '#1A2230',
        borderRadius: 16,
        borderWidth: 0, // Removed border
        overflow: 'hidden',
        marginVertical: 4,
        width: '100%', // Stretch to fill parent
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#232C3D',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pulseIconContainer: {
        marginRight: 10,
    },
    headerTitle: {
        color: '#FF3B30',
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        color: '#8E8E93',
        fontSize: 12,
    },
    headerRightIcon: {
        opacity: 0.8,
    },
    mapContainer: {
        height: 140,
        width: '100%',
        position: 'relative',
        backgroundColor: '#000', // Fallback for loading
    },
    mapOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 40,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#232C3D',
        borderTopWidth: 1,
        borderTopColor: '#2C3547',
    },
    footerText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timestamp: {
        color: '#aaa',
        fontSize: 11,
        marginRight: 4,
    },
    checkIcon: {
        marginLeft: 2,
    },
});

export default LiveLocationCard;
