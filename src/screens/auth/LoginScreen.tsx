import React, { useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { 
  TextInput, 
  Button, 
  Card, 
  Title, 
  Paragraph, 
  ActivityIndicator,
  useTheme 
} from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { login, clearError } from '../../store/slices/authSlice';
import { LoginCredentials, AuthStackParamList } from '../../types';

const loginValidationSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated, token } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && token) {
      // Store token in AsyncStorage
      AsyncStorage.setItem('auth_token', token);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (error) {
      Alert.alert('Login Failed', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleLogin = async (values: LoginCredentials) => {
    dispatch(login(values));
  };

  const initialValues: LoginCredentials = {
    email: '',
    password: '',
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Welcome Back</Title>
          <Paragraph style={styles.subtitle}>
            Sign in to your CRM account
          </Paragraph>

          <Formik
            initialValues={initialValues}
            validationSchema={loginValidationSchema}
            onSubmit={handleLogin}
          >
            {({
              handleChange,
              handleBlur,
              handleSubmit,
              values,
              errors,
              touched,
              isValid,
              dirty,
            }) => (
              <View style={styles.form}>
                <TextInput
                  label="Email"
                  mode="outlined"
                  value={values.email}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  error={touched.email && !!errors.email}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  disabled={isLoading}
                />
                {touched.email && errors.email && (
                  <Paragraph style={styles.errorText}>{errors.email}</Paragraph>
                )}

                <TextInput
                  label="Password"
                  mode="outlined"
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  error={touched.password && !!errors.password}
                  style={styles.input}
                  secureTextEntry
                  disabled={isLoading}
                />
                {touched.password && errors.password && (
                  <Paragraph style={styles.errorText}>{errors.password}</Paragraph>
                )}

                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  disabled={isLoading || !isValid || !dirty}
                  style={styles.loginButton}
                  contentStyle={styles.buttonContent}
                >
                  {isLoading ? <ActivityIndicator color="white" /> : 'Sign In'}
                </Button>

                <Button
                  mode="text"
                  onPress={() => navigation.navigate('Register')}
                  disabled={isLoading}
                  style={styles.registerButton}
                >
                  Don't have an account? Sign Up
                </Button>
              </View>
            )}
          </Formik>

          <View style={styles.demoCredentials}>
            <Paragraph style={styles.demoTitle}>Demo Credentials:</Paragraph>
            <Paragraph style={styles.demoText}>Email: admin@crm.com</Paragraph>
            <Paragraph style={styles.demoText}>Password: admin123</Paragraph>
          </View>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  form: {
    marginTop: 16,
  },
  input: {
    marginBottom: 8,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 8,
  },
  loginButton: {
    marginTop: 16,
    marginBottom: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  registerButton: {
    marginTop: 8,
  },
  demoCredentials: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  demoTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  demoText: {
    fontSize: 12,
    opacity: 0.8,
  },
});

export default LoginScreen;