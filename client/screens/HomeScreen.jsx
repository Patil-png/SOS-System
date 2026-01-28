import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, TouchableOpacity, Linking, Platform, Switch } from 'react-native';
import { Button, IconButton, Avatar, Portal, Dialog, RadioButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as SMS from 'expo-sms';
import * as Location from 'expo-location';

import SOSButton from '../components/SOSButton';
import QuickAction from '../components/QuickAction';
import { initBatteryListener } from '../services/BatteryListener';
import { triggerFakeCall } from '../services/FakeCall';
import { toggleSiren } from '../services/Siren';
import { startBackgroundUpdate, stopBackgroundUpdate } from '../services/BackgroundService';
import { startEmergencyRecording } from '../services/EvidenceService';
import ChatListScreen from './ChatListScreen';
// import ContactsScreen from './ContactsScreen'; // Removed
import SettingsScreen from './SettingsScreen'; // Assuming default export
import GuardianScreen from './GuardianScreen'; // Assuming default export

import { useShakeSensor } from '../hooks/useShakeSensor'; // Import Hook
import SafetyZoneIndicator from '../components/SafetyZoneIndicator';

const Tab = createBottomTabNavigator();

function Dashboard({ navigation }) {
    const [userName, setUserName] = useState('User');
    const [isSirenPlaying, setIsSirenPlaying] = useState(false);
    const [isArmed, setIsArmed] = useState(false); // Move state here or use Context in real app

    // Fake Call State
    const [fakeCallVisible, setFakeCallVisible] = useState(false);
    const [fakeCallDelay, setFakeCallDelay] = useState(10);

    // 1. Setup Shake Listener
    useShakeSensor(() => {
        if (isArmed) {
            handleSOSTrigger();
        }
    });

    useEffect(() => {
        AsyncStorage.getItem('userName').then(name => {
            if (name) setUserName(name);
        });
        const subscription = initBatteryListener();
        return () => { }; // Cleanup
    }, []);

    // ... imports

    const handleSOSTrigger = async () => {
        console.log("EMERGENCY TRIGGERED!");
        Alert.alert("SOS SENT", "Emergency contacts have been notified.\n\nRecording Audio Evidence...");

        // 1. Get Location immediately
        let currentLocation = null;
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                currentLocation = {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    address: "Fetching Address..." // You could use reverse geocoding here
                };
            }
        } catch (e) {
            console.log("Failed to get location for SOS", e);
        }

        // 2. Start Secret Recording with Location
        startEmergencyRecording(currentLocation);

        // 3. IMMEDIATE: Send Incident to Backend (so Guardian sees it instantly)
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (userId && currentLocation) {
                await fetch('http://192.168.29.243:5000/api/incidents/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        victimId: userId,
                        type: 'SOS_ALERT', // Immediate Alert
                        location: currentLocation
                    })
                });
                console.log("Immediate SOS Incident logged.");
            }
        } catch (error) {
            console.log("Failed to log immediate incident:", error);
        }
    };

    const handleFakeCall = () => {
        setFakeCallVisible(true);
    };

    const confirmFakeCall = () => {
        setFakeCallVisible(false);
        Alert.alert("Fake Call Scheduled", `Your phone will ring in ${fakeCallDelay} seconds.`);
        triggerFakeCall(fakeCallDelay);
    };

    const handleSiren = async () => {
        const playing = await toggleSiren();
        setIsSirenPlaying(playing);
    };

    const handleShareLocation = async () => {
        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required.');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            const mapLink = `https://www.google.com/maps/search/?api=1&query=${location.coords.latitude},${location.coords.longitude}`;

            // Get Guardians (Cache First)
            const cached = await AsyncStorage.getItem('cached_guardians');
            const local = await AsyncStorage.getItem('guardians');
            const guardians = JSON.parse(cached || local || '[]');
            const phones = guardians.map(g => g.phone);

            if (phones.length === 0) {
                Alert.alert("No Contacts", "Add contacts in Network tab first.");
                return;
            }

            const { result } = await SMS.sendSMSAsync(
                phones,
                `HELP! I am unsafe. Here is my location: ${mapLink}`
            );

            // --- NEW: Log to App Backend for Recent Alerts ---
            try {
                const userId = await AsyncStorage.getItem('userId');
                if (userId) {
                    await fetch('http://192.168.29.243:5000/api/incidents/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            victimId: userId,
                            type: 'LOCATION_SHARE',
                            location: {
                                latitude: location.coords.latitude,
                                longitude: location.coords.longitude,
                                address: "Manual Location Share"
                            }
                        })
                    });
                    console.log("Location share logged to backend");
                }
            } catch (backendError) {
                console.log("Failed to log location to backend", backendError);
            }

        } else {
            Alert.alert("Error", "SMS is not available on this device");
        }
    };

    // ... imports ...

    const handlePoliceNearby = () => {
        if (Platform.OS === 'android') {
            Linking.openURL('geo:0,0?q=police+station+near+me');
        } else {
            Linking.openURL('http://maps.apple.com/?q=police+station+near+me');
        }
    };

    // State is already defined above in Dashboard
    const toggleArmedMode = async () => {
        const newState = !isArmed;
        setIsArmed(newState);
        if (newState) {
            await startBackgroundUpdate();
            Alert.alert("SafeGuard Active", "Shake detection is ON. We are monitoring your location in the background.");
        } else {
            await stopBackgroundUpdate();
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={isArmed ? ['#e53935', '#d32f2f'] : ['#fff', '#f0f0f0']}
                style={styles.header}
            >
                <SafeAreaView edges={['top']} style={styles.headerContent}>
                    <View>
                        <Text style={[styles.greeting, isArmed && { color: '#fff' }]}>
                            {isArmed ? "ARMED MODE" : `Hello, ${userName}`}
                        </Text>
                        <SafetyZoneIndicator isArmed={isArmed} />
                    </View>
                    <Switch
                        value={isArmed}
                        onValueChange={toggleArmedMode}
                        trackColor={{ false: "#767577", true: "#ffcdd2" }}
                        thumbColor={isArmed ? "#fff" : "#f4f3f4"}
                    />
                </SafeAreaView>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.heroSection}>
                    <SOSButton onTrigger={handleSOSTrigger} />
                    <Text style={styles.heroHint}>Hold to alert contacts</Text>
                </View>

                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.grid}>
                    <View style={styles.row}>
                        <QuickAction title="Fake Call" icon="phone-incoming" color="#2196F3" onPress={handleFakeCall} />
                        <QuickAction
                            title={isSirenPlaying ? "Stop Siren" : "Siren"}
                            icon={isSirenPlaying ? "volume-off" : "bullhorn"}
                            color="#FF9800"
                            onPress={handleSiren}
                        />
                    </View>
                    <View style={styles.row}>
                        <QuickAction title="Share Location" icon="map-marker-radius" color="#4CAF50" onPress={handleShareLocation} />
                        <QuickAction title="Police Nearby" icon="shield-account" color="#607D8B" onPress={handlePoliceNearby} />
                    </View>
                </View>
            </ScrollView>

            {/* Fake Call Dialog */}
            <Portal>
                <Dialog visible={fakeCallVisible} onDismiss={() => setFakeCallVisible(false)} style={{ backgroundColor: '#fff' }}>
                    <Dialog.Title style={{ color: '#333' }}>Schedule Fake Call</Dialog.Title>
                    <Dialog.Content>
                        <RadioButton.Group onValueChange={value => setFakeCallDelay(value)} value={fakeCallDelay}>
                            <RadioButton.Item label="10 Seconds" value={10} color="#2196F3" labelStyle={{ color: '#333' }} />
                            <RadioButton.Item label="30 Seconds" value={30} color="#2196F3" labelStyle={{ color: '#333' }} />
                            <RadioButton.Item label="1 Minute" value={60} color="#2196F3" labelStyle={{ color: '#333' }} />
                        </RadioButton.Group>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setFakeCallVisible(false)} textColor="#666">Cancel</Button>
                        <Button onPress={confirmFakeCall} textColor="#2196F3">Start Timer</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

export default function HomeScreen() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#ff0000',
                tabBarStyle: { height: 60, paddingBottom: 10, paddingTop: 10 },
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={Dashboard}
                options={{ tabBarIcon: ({ color }) => <IconButton icon="home" iconColor={color} size={24} /> }}
            />
            {/* Contacts merged into Network/Guardian tab */}
            <Tab.Screen
                name="Network"
                component={GuardianScreen}
                options={{ tabBarIcon: ({ color }) => <IconButton icon="shield-account" iconColor={color} size={24} /> }}
            />
            <Tab.Screen
                name="Chat"
                component={ChatListScreen}
                options={{ tabBarIcon: ({ color }) => <IconButton icon="message-text-lock" iconColor={color} size={24} /> }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ tabBarIcon: ({ color }) => <IconButton icon="cog" iconColor={color} size={24} /> }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    header: {
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        backgroundColor: '#fff'
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
    },
    greeting: {
        fontSize: 24,
        fontWeight: '800',
        color: '#333',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4CAF50',
        marginRight: 6,
    },
    statusText: {
        color: '#2E7D32',
        fontWeight: '600',
        fontSize: 12,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    heroSection: {
        alignItems: 'center',
        marginVertical: 20,
    },
    heroHint: {
        marginTop: 16,
        color: '#999',
        fontSize: 13,
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 10,
        marginLeft: 4,
    },
    grid: {
        gap: 0,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
});
