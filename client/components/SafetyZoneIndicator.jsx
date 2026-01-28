import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useZoneEngine } from '../context/ZoneEngineContext';

const SafetyZoneIndicator = ({ isArmed }) => {
    const { zoneStatus, riskReason } = useZoneEngine();

    const getStatusColor = () => {
        switch (zoneStatus) {
            case 'RED': return '#D32F2F';
            case 'ORANGE': return '#F57C00';
            case 'YELLOW': return '#FBC02D';
            default: return '#388E3C'; // Green
        }
    };

    const getStatusText = () => {
        switch (zoneStatus) {
            case 'RED': return 'DANGER ZONE';
            case 'ORANGE': return 'High Risk Area';
            case 'YELLOW': return 'Caution Area';
            default: return 'You are safe';
        }
    };

    const color = getStatusColor();
    const textColor = zoneStatus === 'YELLOW' ? '#333' : '#fff';
    // If armed, we might overlap styles, but let's stick to Zone logic as primary indicator

    return (
        <View style={[styles.container, { backgroundColor: isArmed ? 'rgba(255,255,255,0.2)' : '#f5f5f5' }]}>
            <View style={[styles.badge, { backgroundColor: color }]}>
                <MaterialIcons name={zoneStatus === 'RED' ? "warning" : "security"} size={14} color={textColor} />
                <Text style={[styles.text, { color: textColor }]}>
                    {getStatusText()}
                </Text>
            </View>
            {riskReason && (
                <Text style={[styles.reason, { color: isArmed ? '#eee' : '#666' }]}>
                    {riskReason}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
        borderRadius: 16,
        marginTop: 4,
        alignSelf: 'flex-start',
        gap: 8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    text: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    reason: {
        fontSize: 11,
        fontStyle: 'italic',
        marginRight: 4,
    }
});

export default SafetyZoneIndicator;
