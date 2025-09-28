import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { ActivityIndicator, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import 'react-native-reanimated';

import { store, persistor } from '../src/store';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const paperTheme = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme;

  return (
    <Provider store={store}>
      <PersistGate 
        loading={<ActivityIndicator size="large" style={{ flex: 1 }} />} 
        persistor={persistor}
      >
        <PaperProvider theme={paperTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </PaperProvider>
      </PersistGate>
    </Provider>
  );
}
