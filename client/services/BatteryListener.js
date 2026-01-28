import * as Battery from 'expo-battery';
import * as Location from 'expo-location';

const BATTERY_THRESHOLD = 0.05; // 5%

export const initBatteryListener = async () => {
    // Check initial state
    const level = await Battery.getBatteryLevelAsync();
    if (level !== -1 && level <= BATTERY_THRESHOLD) {
        sendLowBatteryAlert(level);
    }

    // Add listener
    const subscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
        if (batteryLevel <= BATTERY_THRESHOLD) {
            sendLowBatteryAlert(batteryLevel);
        }
    });

    return subscription;
};

const sendLowBatteryAlert = async (level) => {
    // Get Location
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
    }

    let location = await Location.getCurrentPositionAsync({});

    // Send to Backend
    console.log("LOW BATTERY ALERT SENT", {
        batteryLevel: level,
        location: location.coords
    });

    // TODO: Implement fetch to backend
    // fetch('YOUR_BACKEND_URL/trigger-emergency', ...)
};
