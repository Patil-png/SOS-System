import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, StatusBar, Alert } from 'react-native';
import { PaperProvider, MD3LightTheme as DefaultTheme, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SOSButton from './components/SOSButton';
import HomeScreen from './screens/HomeScreen';
import SignupScreen from './screens/SignupScreen';
import LoginScreen from './screens/LoginScreen';
import CalculatorScreen from './screens/CalculatorScreen';
import ChatScreen from './screens/ChatScreen';
import LiveTrackingScreen from './screens/LiveTrackingScreen';
import { initBatteryListener } from './services/BatteryListener';
import { triggerFakeCall } from './services/FakeCall';
import FakeCallScreen from './screens/FakeCallScreen';
import * as Notifications from 'expo-notifications';

// Conditional import for CallScreen (requires native modules)
let CallScreen = null;
try {
  CallScreen = require('./screens/CallScreen').default;
} catch (e) {
  console.warn('CallScreen not available (requires Development Client)');
}

import { SettingsProvider } from './context/SettingsContext';
import { ZoneEngineProvider } from './context/ZoneEngineContext';
import { initCrimeDatabase } from './services/CrimeDatabase';

const Stack = createNativeStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#ff0000',
    secondary: '#ff4b4b',
  },
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isStealth, setIsStealth] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const navigationRef = React.useRef(); // Global Navigation Ref

  const checkAuth = async () => {
    const userId = await AsyncStorage.getItem('userId');
    const stealthEnabled = await AsyncStorage.getItem('stealthMode') === 'true';

    setIsAuthenticated(!!userId);
    setIsStealth(stealthEnabled);
  };

  useEffect(() => {
    checkAuth();
    initCrimeDatabase(); // Initialize SQLite DB

    // Listner for when notification triggers while app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received:', notification.request.content.data);
      const type = notification.request.content.data.type;
      if (type === 'fake_call' && navigationRef.current) {
        console.log('🎭 Navigating to FakeCall screen...');
        navigationRef.current.navigate('FakeCall');
      }
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response.notification.request.content.data);
      const type = response.notification.request.content.data.type;
      if (type === 'fake_call' && navigationRef.current) {
        console.log('🎭 Navigating to FakeCall screen (from tap)...');
        navigationRef.current.navigate('FakeCall');
      }
    });

    return () => {
      subscription.remove();
      foregroundSubscription.remove();
    };
  }, []);

  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ff0000" />
      </View>
    );
  }

  // Stealth Mode Logic
  if (isStealth && !isUnlocked && isAuthenticated) {
    return <CalculatorScreen onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <SettingsProvider>
          <ZoneEngineProvider>
            <StatusBar barStyle="dark-content" backgroundColor="#f0f0f0" />
            <NavigationContainer ref={navigationRef}>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!isAuthenticated ? (
                  <>
                    <Stack.Screen name="Login">
                      {(props) => <LoginScreen {...props} onLogin={checkAuth} />}
                    </Stack.Screen>
                    <Stack.Screen name="Signup">
                      {(props) => <SignupScreen {...props} onLogin={checkAuth} />}
                    </Stack.Screen>
                  </>
                ) : (
                  <>
                    <Stack.Screen name="Home" component={HomeScreen} />
                    <Stack.Screen name="ChatScreen" component={ChatScreen} />
                    <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="FakeCall" component={FakeCallScreen} options={{ headerShown: false, gestureEnabled: false }} />
                    {CallScreen && <Stack.Screen name="CallScreen" component={CallScreen} options={{ headerShown: false }} />}
                  </>
                )}
              </Stack.Navigator>
            </NavigationContainer>
          </ZoneEngineProvider>
        </SettingsProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  actions: {
    marginTop: 40,
    flexDirection: 'column', // Changed to column to fit logout
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#e0e0e0',
    width: 200,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#888',
    fontSize: 12,
  }
});
