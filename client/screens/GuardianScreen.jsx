import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, Platform, Dimensions, StatusBar, Linking } from 'react-native';
import { Text, ActivityIndicator, FAB, Button, Dialog, Portal, TextInput as PaperInput, Badge, Divider } from 'react-native-paper';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';

const SERVER_URL = 'http://192.168.29.243:5000';

// ---------------------------------------------------------
// REFINED DARK THEME PALETTE
// ---------------------------------------------------------
const THEME = {
    bg: '#000000',             // Pure Black for OLED
    surface: '#1C1C1E',        // Dark Grey (Card Background)
    surfaceHighlight: '#2C2C2E', // Lighter Grey (Pressed/Input)
    primary: '#6366F1',        // Indigo
    accent: '#0EA5E9',         // Sky Blue
    danger: '#EF4444',         // Red
    success: '#10B981',        // Emerald
    text: '#FFFFFF',           // White
    textSecondary: '#A1A1AA',  // Zinc 400
    border: '#27272A',         // Zinc 800
    divider: '#3F3F46',        // Zinc 700
};

export default function GuardianScreen() {
    const [incidents, setIncidents] = useState([]);
    const [requests, setRequests] = useState([]);
    const [wards, setWards] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Add Contact Dialog State
    const [visible, setVisible] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [priority, setPriority] = useState('both');

    const [sound, setSound] = useState();
    const [playingUri, setPlayingUri] = useState(null);

    useEffect(() => {
        fetchData();
        return () => {
            if (sound) sound.unloadAsync();
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchIncidents(), fetchRequests(), fetchWards(), loadContacts()]);
        setLoading(false);
    };

    const loadContacts = async () => {
        try {
            const stored = await AsyncStorage.getItem('guardians');
            let localContacts = stored ? JSON.parse(stored) : [];

            const userId = await AsyncStorage.getItem('userId');
            if (userId) {
                const response = await fetch(`${SERVER_URL}/api/user/${userId}`);
                const data = await response.json();

                if (data.success && data.user.trustedGuardians) {
                    const serverContacts = data.user.trustedGuardians.map(g => ({
                        id: g._id,
                        name: g.name || "Unknown",
                        phone: g.phone || "Unknown",
                        priority: 'both',
                        isServer: true
                    }));

                    const phoneMap = new Map();
                    localContacts.forEach(c => phoneMap.set(c.phone, c));
                    serverContacts.forEach(c => phoneMap.set(c.phone, c));
                    localContacts = Array.from(phoneMap.values());
                }
            }
            // Sort or Unique filtering if needed
            setContacts(localContacts);
            // Cache for Home Screen use
            await AsyncStorage.setItem('cached_guardians', JSON.stringify(localContacts));
        } catch (error) {
            console.error(error);
        }
    };

    const fetchWards = async () => {
        try {
            const userId = await AsyncStorage.getItem('userId');
            const response = await fetch(`${SERVER_URL}/api/user/${userId}`);
            const data = await response.json();
            if (data.success && data.user.monitoredUsers) {
                setWards(data.user.monitoredUsers);
            }
        } catch (error) {
            console.error('Failed to fetch wards', error);
        }
    };

    const fetchRequests = async () => {
        try {
            const userId = await AsyncStorage.getItem('userId');
            const response = await fetch(`${SERVER_URL}/api/requests/pending/${userId}`);
            const data = await response.json();
            if (data.success) {
                setRequests(data.requests);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchIncidents = async () => {
        try {
            const userId = await AsyncStorage.getItem('userId');
            const response = await fetch(`${SERVER_URL}/api/incidents/my-wards/${userId}`);
            const data = await response.json();

            if (data.success) {
                setIncidents(data.incidents);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const addContact = async () => {
        if (!newName || !newPhone) return;

        try {
            const userId = await AsyncStorage.getItem('userId');
            if (userId) {
                const response = await fetch(`${SERVER_URL}/api/requests/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requesterId: userId, guardianPhone: newPhone })
                });
                const data = await response.json();

                if (response.ok) {
                    Alert.alert("Success", "Connection request sent!");
                } else if (response.status === 404) {
                    Alert.alert("Notice", "User not on SOS App. Added as local contact.");
                } else {
                    Alert.alert("Error", data.error);
                    return;
                }
            }
        } catch (error) {
            Alert.alert("Notice", "Network error. Added as local contact.");
        }

        if (!contacts.find(c => c.phone === newPhone)) {
            const newContact = {
                id: Date.now().toString(),
                name: newName,
                phone: newPhone,
                priority
            };
            const updated = [...contacts, newContact];
            setContacts(updated);
            await AsyncStorage.setItem('guardians', JSON.stringify(updated));
            // Update cache as well
            await AsyncStorage.setItem('cached_guardians', JSON.stringify(updated));
        }

        setVisible(false);
        setNewName('');
        setNewPhone('');
        setPriority('both');
    };

    const removeContact = async (id) => {
        const contact = contacts.find(c => c.id === id);
        if (contact?.isServer) {
            Alert.alert("Cannot Delete", "Linked via server. Please disconnect from Settings.");
            return;
        }
        const updated = contacts.filter(c => c.id !== id);
        setContacts(updated);
        await AsyncStorage.setItem('guardians', JSON.stringify(updated));
        // Update cache as well
        await AsyncStorage.setItem('cached_guardians', JSON.stringify(updated));
    };

    const getPriorityIcon = (p) => {
        if (p === 'call') return 'phone';
        if (p === 'sms') return 'message-text';
        return 'bell-ring';
    };

    const handleRespond = async (requestId, status) => {
        try {
            const response = await fetch(`${SERVER_URL}/api/requests/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, status })
            });
            const data = await response.json();
            if (data.success) {
                Alert.alert("Success", `Request ${status}`);
                fetchData();
            } else {
                Alert.alert("Error", data.error || "Failed");
            }
        } catch (error) {
            Alert.alert("Error", "Network Error");
        }
    };

    const playAudio = async (uri) => {
        try {
            if (sound) {
                await sound.unloadAsync();
                setSound(null);
                setPlayingUri(null);
            }

            const fullUri = uri.startsWith('http') ? uri : `${SERVER_URL}/${uri}`;
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: fullUri },
                { shouldPlay: true }
            );
            setSound(newSound);
            setPlayingUri(uri);

            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                    setPlayingUri(null);
                }
            });

        } catch (error) {
            Alert.alert("Error", "Could not play audio");
        }
    };

    // --- RENDER HELPERS ---

    const SectionBlock = ({ title, icon, color, children, action, actionLabel }) => (
        <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.sectionPill, { backgroundColor: color }]} />
                    <Text style={styles.sectionTitle}>{title}</Text>
                </View>
                {action && (
                    <TouchableOpacity onPress={action} style={styles.actionBtn}>
                        <Text style={[styles.actionLabel, { color: THEME.primary }]}>{actionLabel}</Text>
                        <Ionicons name="add-circle" size={20} color={THEME.primary} />
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.sectionContent}>
                {children}
            </View>
        </View>
    );

    const renderRequest = ({ item }) => (
        <View style={styles.requestCard}>
            <View style={styles.requestContent}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                    <MaterialCommunityIcons name="account-clock" size={24} color={THEME.accent} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.cardTitle}>Connection Request</Text>
                    <Text style={styles.cardSubtitle}>
                        <Text style={{ fontWeight: '700', color: THEME.text }}>{item.requesterId?.name || 'Unknown'}</Text> wants to connect
                    </Text>
                </View>
            </View>

            <View style={styles.requestActionRow}>
                <TouchableOpacity
                    style={[styles.btnOutline, { borderColor: THEME.danger }]}
                    onPress={() => handleRespond(item._id, 'rejected')}
                >
                    <Text style={[styles.btnText, { color: THEME.danger }]}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.btnFilled, { backgroundColor: THEME.success }]}
                    onPress={() => handleRespond(item._id, 'accepted')}
                >
                    <Text style={[styles.btnText, { color: '#000' }]}>Accept</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const openLocation = (lat, lng) => {
        if (!lat || !lng) return;
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${lat},${lng}`;
        const label = 'Incident Location';
        const url = Platform.select({
            ios: `http://maps.apple.com/?q=${latLng}`,
            android: `geo:${latLng}?q=${latLng}(${label})`
        });
        Linking.openURL(url);
    };

    const renderIncident = ({ item }) => {
        const isPlaying = playingUri === item.audioUrl;
        const date = new Date(item.timestamp);
        const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

        return (
            <View style={styles.incidentCard}>
                <View style={styles.incidentLeftStrip} />
                <View style={styles.incidentContent}>
                    <View style={styles.incidentHeaderBar}>
                        <View>
                            <Text style={styles.incidentTitle}>{item.victimId?.name || "Unknown Victim"}</Text>
                            <Text style={styles.incidentMeta}>{dateStr} • {timeStr}</Text>
                        </View>
                        <View style={styles.incidentBadge}>
                            <Text style={styles.incidentBadgeText}>{item.type === 'LOCATION_SHARE' ? 'CHECK-IN' : 'SOS ALERT'}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.mapPreviewContainer}
                        onPress={() => item.location?.latitude && openLocation(item.location.latitude, item.location.longitude)}
                        disabled={!item.location?.latitude}
                        activeOpacity={0.8}
                    >
                        {/* Fake Map Background Effect */}
                        <View style={styles.mapPattern} />

                        <View style={styles.mapContentRow}>
                            <View style={styles.mapIconCircle}>
                                <MaterialCommunityIcons name="google-maps" size={22} color="#FFF" />
                            </View>

                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.mapLabel}>TRACK LOCATION</Text>
                                <Text style={styles.mapCoords} numberOfLines={1}>
                                    {item.location?.latitude
                                        ? `${item.location.latitude.toFixed(6)}, ${item.location.longitude.toFixed(6)}`
                                        : "Waiting for GPS..."}
                                </Text>
                            </View>

                            <View style={styles.mapActionBtn}>
                                <Feather name="external-link" size={16} color={THEME.accent} />
                            </View>
                        </View>

                        {item.location?.latitude && (
                            <View style={styles.addressContainer}>
                                <Text style={styles.addressText} numberOfLines={1}>
                                    {item.location.address !== "Manual Location Share" ? item.location.address : "Pinned Location"}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {item.audioUrl && (
                        <TouchableOpacity
                            onPress={() => isPlaying ? sound?.stopAsync() : playAudio(item.audioUrl)}
                            style={[styles.audioPlayer, isPlaying && { borderColor: THEME.danger, backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                        >
                            <Ionicons name={isPlaying ? "stop-circle" : "play-circle"} size={36} color={isPlaying ? THEME.danger : THEME.primary} />
                            <View style={{ marginLeft: 12 }}>
                                <Text style={[styles.audioText, isPlaying && { color: THEME.danger }]}>
                                    {isPlaying ? "Playing Evidence..." : "Play Audio Recording"}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const renderWardRow = ({ item, index, total }) => (
        <View key={item._id}>
            <View style={styles.rowItem}>
                <View style={[styles.avatarCircle, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                    <Text style={[styles.avatarText, { color: THEME.success }]}>{item.name?.charAt(0).toUpperCase() || 'U'}</Text>
                </View>
                <View style={styles.rowContent}>
                    <Text style={styles.rowTitle}>{item.name || "Unknown"}</Text>
                    <Text style={styles.rowSubtitle}>{item.phone || "No Phone"}</Text>
                </View>
                <View style={styles.statusPill}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Safe</Text>
                </View>
            </View>
            {index < total - 1 && <Divider style={{ backgroundColor: THEME.divider, marginLeft: 66 }} />}
        </View>
    );

    const renderContactRow = ({ item, index, total }) => (
        <View key={item.id}>
            <View style={styles.rowItem}>
                <View style={[styles.avatarCircle, { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}>
                    <MaterialCommunityIcons name={getPriorityIcon(item.priority)} size={20} color={THEME.primary} />
                </View>
                <View style={styles.rowContent}>
                    <Text style={styles.rowTitle}>{item.name}</Text>
                    <Text style={styles.rowSubtitle}>{item.phone}</Text>
                </View>
                {item.isServer ? (
                    <MaterialCommunityIcons name="cloud-check" size={20} color={THEME.textSecondary} style={{ opacity: 0.5 }} />
                ) : (
                    <TouchableOpacity onPress={() => removeContact(item.id)} style={styles.iconBtn}>
                        <Feather name="trash-2" size={18} color={THEME.danger} />
                    </TouchableOpacity>
                )}
            </View>
            {index < total - 1 && <Divider style={{ backgroundColor: THEME.divider, marginLeft: 66 }} />}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={THEME.bg} />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Guardian Center</Text>
                    <Text style={styles.headerSubtitle}>Monitor & Protect</Text>
                </View>
                <TouchableOpacity onPress={fetchData} style={styles.refreshBtn}>
                    <Ionicons name="sync" size={20} color={THEME.text} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={THEME.primary} />
                    <Text style={{ marginTop: 15, color: THEME.textSecondary }}>Syncing data...</Text>
                </View>
            ) : (
                <FlatList
                    contentContainerStyle={styles.scrollContent}
                    data={incidents}
                    keyExtractor={item => item._id}
                    renderItem={renderIncident}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <View style={{ paddingTop: 20 }}>
                            {/* Requests */}
                            {requests.length > 0 && (
                                <View style={{ marginBottom: 24 }}>
                                    <Text style={styles.listSectionTitle}>PENDING ACTIONS</Text>
                                    {requests.map(req => (
                                        <View key={req._id} style={{ marginBottom: 12 }}>
                                            {renderRequest({ item: req })}
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Wards Section Block */}
                            <SectionBlock title="People I Protect" color={THEME.success}>
                                {wards.length === 0 ? (
                                    <View style={styles.emptyRow}>
                                        <Text style={styles.emptyText}>You are not monitoring anyone yet.</Text>
                                    </View>
                                ) : (
                                    wards.map((ward, index) => renderWardRow({ item: ward, index, total: wards.length }))
                                )}
                            </SectionBlock>

                            {/* Contacts Section Block */}
                            <SectionBlock
                                title="My Trusted Guardians"
                                color={THEME.primary}
                                action={() => setVisible(true)}
                                actionLabel="Add"
                            >
                                {contacts.length === 0 ? (
                                    <View style={styles.emptyRow}>
                                        <Text style={styles.emptyText}>No guardians added yet.</Text>
                                    </View>
                                ) : (
                                    contacts.map((item, index) => renderContactRow({ item, index, total: contacts.length }))
                                )}
                            </SectionBlock>

                            <View style={styles.dividerRow}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>RECENT ALERTS LOG</Text>
                                <View style={styles.dividerLine} />
                            </View>
                        </View>
                    }
                    ListEmptyComponent={
                        !loading && (
                            <View style={styles.emptyStateContainer}>
                                <MaterialCommunityIcons name="shield-check-outline" size={48} color={THEME.textSecondary} style={{ opacity: 0.3 }} />
                                <Text style={styles.emptyStateTitle}>All Clear</Text>
                                <Text style={styles.emptyStateText}>No SOS alerts recorded recently.</Text>
                            </View>
                        )
                    }
                />
            )}

            {/* Floating Action Button */}
            <FAB
                style={styles.fab}
                icon="plus"
                color="#FFFFFF"
                onPress={() => setVisible(true)}
            />

            {/* Add Contact Modal */}
            <Portal>
                <Dialog visible={visible} onDismiss={() => setVisible(false)} style={styles.dialog}>
                    <Dialog.Title style={styles.dialogTitle}>Add Guardian</Dialog.Title>
                    <Dialog.Content>
                        <View style={styles.inputContainer}>
                            <PaperInput
                                label="Full Name"
                                value={newName}
                                onChangeText={setNewName}
                                mode="flat"
                                underlineColor="transparent"
                                activeUnderlineColor={THEME.primary}
                                style={styles.input}
                                theme={{ colors: { text: THEME.text, placeholder: THEME.textSecondary, primary: THEME.primary, background: THEME.surfaceHighlight } }}
                            />
                        </View>
                        <View style={styles.inputContainer}>
                            <PaperInput
                                label="Phone Number"
                                value={newPhone}
                                onChangeText={setNewPhone}
                                keyboardType="phone-pad"
                                mode="flat"
                                underlineColor="transparent"
                                activeUnderlineColor={THEME.primary}
                                style={styles.input}
                                theme={{ colors: { text: THEME.text, placeholder: THEME.textSecondary, primary: THEME.primary, background: THEME.surfaceHighlight } }}
                            />
                        </View>

                        <Text style={styles.priorityLabel}>Notification Priority</Text>
                        <View style={styles.prioritySelector}>
                            {['call', 'sms', 'both'].map((p) => (
                                <TouchableOpacity
                                    key={p}
                                    onPress={() => setPriority(p)}
                                    style={[
                                        styles.priorityOption,
                                        priority === p && { backgroundColor: THEME.primary, borderColor: THEME.primary }
                                    ]}
                                >
                                    <Text style={[styles.priorityOptionText, priority === p && { color: '#FFF', fontWeight: 'bold' }]}>
                                        {p.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Dialog.Content>
                    <Dialog.Actions style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                        <Button onPress={() => setVisible(false)} labelStyle={{ color: THEME.textSecondary }}>Cancel</Button>
                        <Button onPress={addContact} mode="contained" buttonColor={THEME.primary} style={{ borderRadius: 8 }}>Save</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.bg,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Header
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        paddingBottom: 15,
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: THEME.bg,
        borderBottomWidth: 1,
        borderBottomColor: THEME.surfaceHighlight,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: THEME.text,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 13,
        color: THEME.textSecondary,
        fontWeight: '500',
        marginTop: 2,
    },
    refreshBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: THEME.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: THEME.border
    },

    // Layout
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },

    // --- SECTION BLOCKS ---
    sectionBlock: {
        marginBottom: 30, // Large gap between sections
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingHorizontal: 4,
    },
    sectionPill: {
        width: 4,
        height: 16,
        borderRadius: 2,
        marginRight: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: THEME.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    actionLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginRight: 4,
    },
    sectionContent: {
        backgroundColor: THEME.surface,
        borderRadius: 16,
        overflow: 'hidden', // clips the borders
        borderWidth: 1,
        borderColor: THEME.border,
    },

    // Row Item Styles (Inside Section)
    rowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    emptyRow: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: THEME.textSecondary,
        fontStyle: 'italic',
        fontSize: 14,
    },
    avatarCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    avatarText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    rowContent: {
        flex: 1,
    },
    rowTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: THEME.text,
        marginBottom: 2,
    },
    rowSubtitle: {
        fontSize: 13,
        color: THEME.textSecondary,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: THEME.success,
        marginRight: 6,
    },
    statusText: {
        color: THEME.success,
        fontSize: 12,
        fontWeight: '600',
    },
    iconBtn: {
        padding: 8,
    },

    // Requests
    listSectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: THEME.textSecondary,
        marginBottom: 10,
        letterSpacing: 1,
    },
    requestCard: {
        backgroundColor: THEME.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(14, 165, 233, 0.3)',
    },
    requestContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: THEME.text,
        marginBottom: 2,
    },
    cardSubtitle: {
        fontSize: 14,
        color: THEME.textSecondary,
    },
    requestActionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    btnOutline: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    btnFilled: {
        paddingVertical: 8,
        paddingHorizontal: 24,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        fontWeight: '600',
        fontSize: 13,
    },

    // Alerts Log Divider
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: THEME.border,
    },
    dividerText: {
        marginHorizontal: 12,
        color: THEME.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },

    // Incident Card (Refined)
    incidentCard: {
        flexDirection: 'row',
        backgroundColor: THEME.surface,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: THEME.border,
    },
    incidentLeftStrip: {
        width: 4,
        backgroundColor: THEME.danger,
    },
    incidentContent: {
        flex: 1,
        padding: 16,
    },
    incidentHeaderBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    incidentTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: THEME.text,
    },
    incidentMeta: {
        fontSize: 12,
        color: THEME.textSecondary,
        marginTop: 2,
    },
    incidentBadge: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    incidentBadgeText: {
        color: THEME.danger,
        fontSize: 10,
        fontWeight: 'bold',
    },
    // Map Preview Card
    mapPreviewContainer: {
        backgroundColor: '#1E293B', // Slate 800
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 16,
        position: 'relative',
    },
    mapPattern: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#1E293B',
        opacity: 0.5,
        // In a real app, you might use an ImageBackground here for a map texture
    },
    mapContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        zIndex: 1,
    },
    mapIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#0EA5E9',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#0EA5E9',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    mapLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8', // Slate 400
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    mapCoords: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 14,
        fontWeight: 'bold',
        color: '#F8FAFC', // Slate 50
    },
    mapActionBtn: {
        padding: 8,
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        borderRadius: 8,
    },
    addressContainer: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)', // Slate 900 transparent
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    addressText: {
        fontSize: 11,
        color: '#CBD5E1', // Slate 300
    },

    incidentLocationBox: {
        // Legacy style, kept just in case or can be removed if unused
        flexDirection: 'row',
        marginBottom: 12,
    },
    incidentLocation: {
        color: THEME.textSecondary,
        fontSize: 13,
        marginLeft: 6,
        flex: 1,
        lineHeight: 18,
    },
    audioPlayer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.surfaceHighlight,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: THEME.border,
    },
    audioText: {
        color: THEME.primary,
        fontWeight: '600',
        fontSize: 14,
    },

    // Empty State
    emptyStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyStateTitle: {
        color: THEME.text,
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    emptyStateText: {
        color: THEME.textSecondary,
        marginTop: 8,
    },

    // FAB
    fab: {
        position: 'absolute',
        margin: 20,
        right: 0,
        bottom: 0,
        backgroundColor: THEME.primary,
        borderRadius: 16,
    },

    // Dialog
    dialog: {
        backgroundColor: THEME.surface,
        borderRadius: 16,
    },
    dialogTitle: {
        color: THEME.text,
        fontWeight: '700',
    },
    inputContainer: {
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
    },
    input: {
        backgroundColor: THEME.surfaceHighlight,
        height: 54,
    },
    priorityLabel: {
        color: THEME.textSecondary,
        fontSize: 12,
        marginBottom: 8,
        marginTop: 4,
        marginLeft: 4,
    },
    prioritySelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    priorityOption: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: THEME.border,
        borderRadius: 8,
        marginHorizontal: 4,
        backgroundColor: THEME.surfaceHighlight,
    },
    priorityOptionText: {
        fontSize: 12,
        fontWeight: '600',
        color: THEME.textSecondary,
    },
});