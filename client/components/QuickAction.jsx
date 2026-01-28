import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { Text, Surface, Icon } from 'react-native-paper';

export default function QuickAction({ icon, title, onPress, color = '#ff0000', size = 'small' }) {
    const isLarge = size === 'large';

    return (
        <Surface style={[styles.container, isLarge ? styles.large : styles.small]} elevation={2}>
            <Pressable
                style={({ pressed }) => [
                    styles.pressable,
                    { opacity: pressed ? 0.9 : 1 }
                ]}
                onPress={onPress}
            >
                <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                    <Icon source={icon} size={32} color={color} />
                </View>
                <Text style={styles.title} numberOfLines={2}>{title}</Text>
            </Pressable>
        </Surface>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#fff',
        margin: 6,
    },
    large: {
        height: 120,
        flex: 2, // Take more space if flex row
    },
    small: {
        height: 120,
        flex: 1,
    },
    pressable: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between',
    },
    iconContainer: {
        padding: 10,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
        marginTop: 8,
    }
});
