import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';

const LOCATION_TASK_NAME = 'background-location-task';

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Background task error:', error);
        return;
    }
    if (data) {
        const { locations } = data;
        // We don't actually need to do anything with the location data for the "Hack"
        // Just receiving it keeps the app alive.
        // console.log('Received new locations', locations);
    }
});

// Configure Notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

export const requestPermissions = async () => {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
        Alert.alert('Permission to access background location was denied');
        return false;
    }

    return true;
};

export const startBackgroundUpdate = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000, // Update every 10 seconds
            distanceInterval: 50, // or every 50 meters
            foregroundService: {
                notificationTitle: "SafeGuard Active",
                notificationBody: "Shake to Alert is ON. We are monitoring your safety.",
                notificationColor: "#ff0000",
            },
        });
        console.log("Background Task Started");
    } catch (err) {
        console.error("Failed to start background task:", err);
    }
};

export const stopBackgroundUpdate = async () => {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        console.log("Background Task Stopped");
    }
};
