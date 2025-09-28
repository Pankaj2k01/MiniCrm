import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Avatar,
  Divider,
  useTheme 
} from 'react-native-paper';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAppDispatch, useAppSelector } from '../../src/hooks/redux';
import { logout } from '../../src/store/slices/authSlice';

export default function ProfileScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('user_data');
            dispatch(logout());
            router.replace('/login');
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.profileCard}>
        <Card.Content style={styles.cardContent}>
          <Avatar.Text 
            size={80} 
            label={user?.name?.substring(0, 2).toUpperCase() || 'U'} 
            style={styles.avatar}
          />
          
          <Title style={styles.name}>{user?.name || 'Unknown User'}</Title>
          <Paragraph style={styles.email}>{user?.email || 'No email'}</Paragraph>
          <Paragraph style={styles.role}>
            Role: {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || 'User'}
          </Paragraph>
        </Card.Content>
      </Card>

      <Card style={styles.actionCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Account Actions</Title>
          <Divider style={styles.divider} />
          
          <Button
            mode="contained"
            onPress={handleLogout}
            style={styles.logoutButton}
            icon="logout"
            buttonColor={theme.colors.error}
          >
            Logout
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    marginBottom: 16,
    elevation: 4,
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    backgroundColor: '#2196F3',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionCard: {
    marginBottom: 16,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  logoutButton: {
    marginTop: 8,
  },
});
