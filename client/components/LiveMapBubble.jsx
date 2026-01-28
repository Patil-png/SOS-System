import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

const LiveMapBubble = ({ latitude, longitude }) => {
    const webViewRef = useRef(null);

    // Initial HTML with Leaflet Setup
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { margin: 0; padding: 0; }
            #map { width: 100%; height: 100vh; background: #222; }
            .leaflet-control-attribution { display: none; } /* Clean look */
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            var map = L.map('map', { zoomControl: false }).setView([${latitude}, ${longitude}], 15);
            
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19
            }).addTo(map);

            var marker = L.marker([${latitude}, ${longitude}]).addTo(map);

            // Function to update location from React Native
            function updateLocation(lat, lng) {
                var newLatLng = new L.LatLng(lat, lng);
                marker.setLatLng(newLatLng);
                map.panTo(newLatLng);
            }
        </script>
    </body>
    </html>
    `;

    // Inject updates when props change
    useEffect(() => {
        if (webViewRef.current) {
            const script = `updateLocation(${latitude}, ${longitude}); true;`;
            webViewRef.current.injectJavaScript(script);
        }
    }, [latitude, longitude]);

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: htmlContent }}
                style={styles.webview}
                scrollEnabled={false}
                pointerEvents="none" // Pass touches through (optional, or 'auto' to allow pan)
            />
            {/* Overlay to prevent interaction if we want it to just be a visual bubble */}
            <View style={styles.overlay} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1C1C1E',
    },
    webview: {
        flex: 1,
        opacity: 0.9,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
    }
});

export default LiveMapBubble;
