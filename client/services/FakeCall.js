import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
        // For fake calls, don't show alert in foreground - let the listener navigate directly
        const isFakeCall = notification.request.content.data.type === 'fake_call';

        return {
            shouldShowAlert: !isFakeCall, // Don't show banner for fake calls
            shouldPlaySound: true,
            shouldSetBadge: false,
        };
    },
});

export const triggerFakeCall = async (delaySeconds = 10) => {
    console.log('🎬 triggerFakeCall called with delay:', delaySeconds, 'seconds');

    try {
        const { status } = await Notifications.requestPermissionsAsync();
        console.log('📋 Notification permission status:', status);

        if (status !== 'granted') {
            console.error('❌ Notification permission not granted');
            alert('Permission for notifications not granted');
            return;
        }

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: "Incoming Call",
                body: "Dad", // Realistic name
                data: { type: 'fake_call' },
                sound: 'default', // Ideally upload a custom ringtone
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: delaySeconds,
                repeats: false,
            },
        });

        console.log('✅ Fake call notification scheduled successfully! ID:', notificationId);
        console.log(`⏰ Notification will fire in ${delaySeconds} seconds`);
    } catch (error) {
        console.error('❌ Error scheduling fake call notification:', error);
    }
};
