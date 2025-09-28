import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAppDispatch, useAppSelector } from '../src/hooks/redux';
import { setCredentials } from '../src/store/slices/authSlice';

export default function Index() {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        const userDataString = await AsyncStorage.getItem('user_data');
        
        if (token && userDataString) {
          const userData = JSON.parse(userDataString);
          dispatch(setCredentials({ user: userData, token }));
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthState();
  }, [dispatch]);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    }
  }, [isLoading, isAuthenticated]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}