import React, { useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
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
import { register, clearError } from '../../store/slices/authSlice';
import { RegisterCredentials, AuthStackParamList } from '../../types';

const registerValidationSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .required('Name is required'),
  email: Yup.string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
});

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<RegisterScreenNavigationProp>();
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
      Alert.alert('Registration Failed', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleRegister = async (values: RegisterCredentials) => {
    dispatch(register(values));
  };

  const initialValues: RegisterCredentials = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Create Account</Title>
          <Paragraph style={styles.subtitle}>
            Join our CRM platform
          </Paragraph>

          <Formik
            initialValues={initialValues}
            validationSchema={registerValidationSchema}
            onSubmit={handleRegister}
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
                  label="Full Name"
                  mode="outlined"
                  value={values.name}
                  onChangeText={handleChange('name')}
                  onBlur={handleBlur('name')}
                  error={touched.name && !!errors.name}
                  style={styles.input}
                  disabled={isLoading}
                />
                {touched.name && errors.name && (
                  <Paragraph style={styles.errorText}>{errors.name}</Paragraph>
                )}

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

                <TextInput
                  label="Confirm Password"
                  mode="outlined"
                  value={values.confirmPassword}
                  onChangeText={handleChange('confirmPassword')}
                  onBlur={handleBlur('confirmPassword')}
                  error={touched.confirmPassword && !!errors.confirmPassword}
                  style={styles.input}
                  secureTextEntry
                  disabled={isLoading}
                />
                {touched.confirmPassword && errors.confirmPassword && (
                  <Paragraph style={styles.errorText}>{errors.confirmPassword}</Paragraph>
                )}

                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  disabled={isLoading || !isValid || !dirty}
                  style={styles.registerButton}
                  contentStyle={styles.buttonContent}
                >
                  {isLoading ? <ActivityIndicator color="white" /> : 'Create Account'}
                </Button>

                <Button
                  mode="text"
                  onPress={() => navigation.navigate('Login')}
                  disabled={isLoading}
                  style={styles.loginButton}
                >
                  Already have an account? Sign In
                </Button>
              </View>
            )}
          </Formik>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    justifyContent: 'center',
    minHeight: '100%',
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
  registerButton: {
    marginTop: 16,
    marginBottom: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  loginButton: {
    marginTop: 8,
  },
});

export default RegisterScreen;