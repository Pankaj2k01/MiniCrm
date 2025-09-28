import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setCredentials } from '../store/slices/authSlice';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main Screens (placeholders for now)
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import CustomerListScreen from '../screens/customers/CustomerListScreen';
import CustomerDetailsScreen from '../screens/customers/CustomerDetailsScreen';
import CustomerFormScreen from '../screens/customers/CustomerFormScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { UserManagementScreen } from '../screens/UserManagementScreen';

import { RootStackParamList, AuthStackParamList, MainTabParamList, CustomerStackParamList } from '../types';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const RootStack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const CustomerStack = createStackNavigator<CustomerStackParamList>();

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

const CustomerNavigator = () => (
  <CustomerStack.Navigator>
    <CustomerStack.Screen 
      name="CustomerList" 
      component={CustomerListScreen} 
      options={{ title: 'Customers' }}
    />
    <CustomerStack.Screen 
      name="CustomerDetails" 
      component={CustomerDetailsScreen} 
      options={{ title: 'Customer Details' }}
    />
    <CustomerStack.Screen 
      name="CustomerForm" 
      component={CustomerFormScreen} 
      options={({ route }) => ({
        title: route.params?.customerId ? 'Edit Customer' : 'Add Customer'
      })}
    />
  </CustomerStack.Navigator>
);

const MainNavigator = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdminOrManager = user && ['admin', 'manager'].includes(user.role);

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
          } else if (route.name === 'Customers') {
            iconName = focused ? 'account-group' : 'account-group-outline';
          } else if (route.name === 'Users') {
            iconName = focused ? 'account-multiple' : 'account-multiple-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <MainTab.Screen name="Dashboard" component={DashboardScreen} />
      <MainTab.Screen 
        name="Customers" 
        component={CustomerNavigator} 
        options={{ headerShown: false }}
      />
      {isAdminOrManager && (
        <MainTab.Screen 
          name="Users" 
          component={UserManagementScreen} 
          options={{ title: 'User Management' }}
        />
      )}
      <MainTab.Screen name="Profile" component={ProfileScreen} />
    </MainTab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const [initializing, setInitializing] = React.useState(true);

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          // In a real app, you might want to verify the token with the server
          // For now, we'll just assume it's valid
          const userDataString = await AsyncStorage.getItem('user_data');
          if (userDataString) {
            const userData = JSON.parse(userDataString);
            dispatch(setCredentials({ user: userData, token }));
          }
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      } finally {
        setInitializing(false);
      }
    };

    checkAuthState();
  }, [dispatch]);

  if (initializing || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <RootStack.Screen name="Main" component={MainNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
};

export default AppNavigator;