import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = 'http://192.168.29.243:5000';

const COLORS = {
    bg: '#000000',
    card: '#1C1C1E',
    text: '#FFFFFF',
    subText: '#8E8E93',
    accent: '#0A84FF', // iOS Blue for Chat
    divider: '#2C2C2E'
};

export default function ChatListScreen({ navigation }) {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const isFocused = useIsFocused(); // Refresh when tab is active

    useEffect(() => {
        if (isFocused) {
            fetchContacts();
        }
    }, [isFocused]);

    const fetchContacts = async () => {
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) return;

            const response = await fetch(`${API_URL}/api/user/${userId}`);
            const data = await response.json();

            if (data.success) {
                // Combine Guardians and Wards into a single unique list
                const allContacts = [
                    ...data.user.trustedGuardians.map(c => ({ ...c, role: 'Guardian' })),
                    ...data.user.monitoredUsers.map(c => ({ ...c, role: 'Protected' }))
                ];

                // Remove duplicates just in case
                const uniqueContacts = allContacts.filter((v, i, a) => a.findIndex(t => (t._id === v._id)) === i);

                setContacts(uniqueContacts);
            }
        } catch (error) {
            console.error('Failed to fetch contacts', error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.contactItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ChatScreen', {
                contactId: item._id,
                contactName: item.name
            })}
        >
            {/* Avatar Circle */}
            <View style={styles.avatarContainer}>
                <LinearGradient
                    colors={item.role === 'Guardian' ? ['#2DD4BF', '#0D9488'] : ['#FF453A', '#D50000']}
                    style={styles.avatar}
                >
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
            </View>

            {/* Info */}
            <View style={styles.infoContainer}>
                <View style={styles.nameRow}>
                    <Text style={styles.name}>{item.name}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: item.role === 'Guardian' ? 'rgba(45, 212, 191, 0.1)' : 'rgba(255, 69, 58, 0.1)' }]}>
                        <Text style={[styles.roleText, { color: item.role === 'Guardian' ? '#2DD4BF' : '#FF453A' }]}>
                            {item.role.toUpperCase()}
                        </Text>
                    </View>
                </View>
                <Text style={styles.lastMessage} numberOfLines={1}>
                    Tap to start secure transmission...
                </Text>
            </View>

            <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.subText} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>SECURE COMMS</Text>
                <View style={styles.headerBadge}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.headerSubtitle}>ENCRYPTED</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                </View>
            ) : (
                <FlatList
                    data={contacts}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="shield-off-outline" size={48} color={COLORS.subText} />
                            <Text style={styles.emptyText}>No secure contacts found.</Text>
                            <Text style={styles.emptySubText}>Add guardians or wards to begin messaging.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerTitle: {
        color: COLORS.text,
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(10, 132, 255, 0.1)', // Blue tint
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(10, 132, 255, 0.3)'
    },
    onlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#0A84FF',
        marginRight: 6
    },
    headerSubtitle: {
        color: '#0A84FF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 20,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: COLORS.bg, // Transparent/Black
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    infoContainer: {
        flex: 1,
        marginRight: 10,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    roleBadge: {
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 4,
    },
    roleText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    lastMessage: {
        color: COLORS.subText,
        fontSize: 14,
    },
    separator: {
        height: 1,
        backgroundColor: COLORS.divider,
        marginLeft: 82, // Offset for avatar
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
        opacity: 0.5
    },
    emptyText: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 10,
    },
    emptySubText: {
        color: COLORS.subText,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 5,
    }
});
