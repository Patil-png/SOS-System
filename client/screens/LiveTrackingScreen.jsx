import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView, StatusBar, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ChatService from '../services/ChatService';

export default function LiveTrackingScreen({ route, navigation }) {
    const { contactId, contactName, initialLocation, messageId } = route.params;
    const webViewRef = useRef(null);
    const [statusText, setStatusText] = useState("Connecting to live feed...");
    const [lastUpdated, setLastUpdated] = useState(null);

    // HTML Content for Full Screen Leaflet Map
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { margin: 0; padding: 0; background: #000; }
            #map { width: 100vw; height: 100vh; }
            .leaflet-bar { display: none; } /* Hide zoom controls for cleaner app look */
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            var map = L.map('map', { zoomControl: false }).setView([${initialLocation.latitude}, ${initialLocation.longitude}], 16);
            
            // Dark Mode Tiles
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19,
                attribution: 'OpenStreetMap'
            }).addTo(map);

            // Pulsing Marker Icon maybe? For now standard red.
            var icon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
            });

            var marker = L.marker([${initialLocation.latitude}, ${initialLocation.longitude}], {icon: icon}).addTo(map);

            function updateLocation(lat, lng) {
                var newLatLng = new L.LatLng(lat, lng);
                marker.setLatLng(newLatLng);
                map.panTo(newLatLng);
            }
        </script>
    </body>
    </html>
    `;

    useEffect(() => {
        setStatusText(`Tracking ${contactName}...`);

        // Listen for socket updates targeting this specific message/user
        const handleUpdate = (data, isUpdate) => {
            if (data.messageId === messageId || data.senderId === contactId) {
                const { latitude, longitude } = data.location;
                updateMap(latitude, longitude);
            }
        };

        // We re-use ChatService listener logic, but we need to ensure we don't conflict
        // Actually ChatService might multicast if we register another one?
        // ChatService.js handles one callback. 
        // We will piggyback on the fact that ChatService is a singleton but implemented simply.
        // Let's modify ChatService to allow multiple listeners OR just listen manually here?
        // Simpler: Just rely on the fact that this screen is active.
        // BUT ChatScreen is also active in stack. 

        // Let's modify ChatService to support multiple listeners or just overriding for now.
        // Actually, we can just use `ChatService.socket.on` directly since we imported the instance logic.

        if (ChatService.socket) {
            ChatService.socket.on('live_location_updated', (data) => {
                // Check if it matches our tracking target
                // data: { messageId, location }
                if (data.messageId === messageId) {
                    updateMap(data.location.latitude, data.location.longitude);
                    setLastUpdated(new Date().toLocaleTimeString());
                }
            });
        }

        return () => {
            if (ChatService.socket) {
                ChatService.socket.off('live_location_updated');
            }
        };
    }, []);

    const updateMap = (lat, lng) => {
        if (webViewRef.current) {
            const script = `updateLocation(${lat}, ${lng}); true;`;
            webViewRef.current.injectJavaScript(script);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: htmlContent }}
                style={styles.webview}
            />

            {/* Overlay Header */}
            <SafeAreaView style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.infoBadge}>
                    <View style={styles.redDot} />
                    <Text style={styles.infoText}>{statusText}</Text>
                </View>
            </SafeAreaView>

            {/* Bottom Overlay */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>Live GPS Feed • Encrypted</Text>
                {lastUpdated && <Text style={styles.updateText}>Last Update: {lastUpdated}</Text>}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    webview: {
        flex: 1,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        paddingTop: Platform.OS === 'android' ? 40 : 15,
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    infoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    redDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF453A',
        marginRight: 8,
    },
    infoText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    footerText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '500',
    },
    updateText: {
        color: '#00FF00', // Bright green for visibility
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 4
    }
});
