import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Resource, Permission } from '../types';
import { 
  LoginCredentials, 
  RegisterCredentials, 
  Customer, 
  CustomerFormValues, 
  Lead, 
  LeadFormValues,
  ApiResponse,
  PaginatedResponse,
  DashboardStats
} from '../types';

// Base URL for your API (use local IP for mobile access)
const API_BASE_URL = 'http://10.170.230.39:3001/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const authDataString = await AsyncStorage.getItem('auth_data');
      if (authDataString) {
        const { accessToken } = JSON.parse(authDataString);
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token expiration
      await AsyncStorage.removeItem('auth_data');
      // You might want to redirect to login screen here
    }
    return Promise.reject(error.response?.data || error);
  }
);

// RBAC Permission System
export const ROLE_PERMISSIONS: Record<string, Record<Resource, Permission[]>> = {
  admin: {
    customers: ['create', 'read', 'update', 'delete'],
    leads: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete'],
    teams: ['create', 'read', 'update', 'delete'],
    activities: ['create', 'read', 'update', 'delete'],
    reports: ['read', 'export'],
  },
  manager: {
    customers: ['create', 'read', 'update', 'delete'],
    leads: ['create', 'read', 'update', 'delete'],
    users: ['read'],
    teams: ['read', 'update'],
    activities: ['create', 'read', 'update', 'delete'],
    reports: ['read', 'export'],
  },
  sales_rep: {
    customers: ['create', 'read', 'update'],
    leads: ['create', 'read', 'update'],
    users: ['read'],
    teams: ['read'],
    activities: ['create', 'read', 'update'],
    reports: ['read'],
  },
};

// Permission utility functions
export const hasPermission = (user: User | null, resource: Resource, permission: Permission): boolean => {
  if (!user) return false;
  const rolePermissions = ROLE_PERMISSIONS[user.role];
  if (!rolePermissions) return false;
  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) return false;
  return resourcePermissions.includes(permission);
};

export const canAccessRecord = (user: User | null, record: { ownerId?: string; assignedTo?: string; teamId?: string }): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'manager' && record.teamId === user.teamId) return true;
  if (record.ownerId === user.id) return true;
  if (record.assignedTo === user.id) return true;
  return false;
};

export const getFilteredQuery = (user: User | null): Record<string, string> => {
  if (!user) return {};
  if (user.role === 'admin') return {};
  if (user.role === 'manager') return { teamId: user.teamId || '' };
  return { ownerId: user.id };
};

// Authentication API (enhanced with RBAC)
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<ApiResponse<{ user: any; accessToken: string; refreshToken: string }>> => {
    try {
      console.log('🔐 Attempting login with:', credentials.email);
      const response = await apiClient.post('/auth/login', credentials);
      
      const { user, accessToken, refreshToken } = response.data.data;
      console.log('✅ Login successful for user:', user.name);
      
      // Store tokens in AsyncStorage
      try {
        await AsyncStorage.setItem('auth_data', JSON.stringify({
          user,
          accessToken,
          refreshToken
        }));
        console.log('💾 Auth data stored successfully');
      } catch (storageError) {
        console.error('⚠️ Failed to store auth data:', storageError);
        // Continue anyway, the login can still work without persistence
      }
      
      return {
        success: true,
        message: response.data.message,
        data: {
          user,
          token: accessToken, // For backward compatibility
          accessToken,
          refreshToken
        }
      };
    } catch (error: any) {
      console.error('❌ Login error:', error);
      const message = error.response?.data?.message || error.message || 'Login failed';
      throw new Error(message);
    }
  },
  
  register: async (credentials: RegisterCredentials): Promise<ApiResponse<{ user: any; accessToken: string; refreshToken: string }>> => {
    return apiClient.post('/auth/register', credentials)
      .then(res => {
        const { user, accessToken, refreshToken } = res.data.data;
        // Store tokens in AsyncStorage
        AsyncStorage.setItem('auth_data', JSON.stringify({
          user,
          accessToken,
          refreshToken
        }));
        return {
          success: true,
          message: res.data.message,
          data: {
            user,
            token: accessToken, // For backward compatibility
            accessToken,
            refreshToken
          }
        };
      })
      .catch(error => {
        const message = error.response?.data?.message || 'Registration failed';
        throw new Error(message);
      });
  },

  logout: async (): Promise<void> => {
    try {
      const authDataString = await AsyncStorage.getItem('auth_data');
      const refreshToken = authDataString ? JSON.parse(authDataString).refreshToken : null;
      
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      await AsyncStorage.removeItem('auth_data');
    }
  },

  refreshToken: async (): Promise<ApiResponse<{ user: any; accessToken: string; refreshToken: string }>> => {
    const authDataString = await AsyncStorage.getItem('auth_data');
    if (!authDataString) {
      throw new Error('No refresh token available');
    }

    const { refreshToken } = JSON.parse(authDataString);
    return apiClient.post('/auth/refresh-token', { refreshToken })
      .then(res => {
        const { user, accessToken, refreshToken: newRefreshToken } = res.data.data;
        // Update stored tokens
        AsyncStorage.setItem('auth_data', JSON.stringify({
          user,
          accessToken,
          refreshToken: newRefreshToken
        }));
        return {
          success: true,
          message: res.data.message,
          data: {
            user,
            token: accessToken,
            accessToken,
            refreshToken: newRefreshToken
          }
        };
      })
      .catch(error => {
        // If refresh fails, clear auth data
        AsyncStorage.removeItem('auth_data');
        throw new Error(error.response?.data?.message || 'Token refresh failed');
      });
  },
};

// Customer API with RBAC
export const customerAPI = {
  getCustomers: async (params: { page?: number; search?: string; status?: string; industry?: string; source?: string } = {}): Promise<PaginatedResponse<Customer>> => {
    return apiClient.get('/customers', { params })
      .then(res => ({
        success: true,
        data: res.data.data,
        pagination: res.data.pagination
      }));
  },
  
  getCustomerById: async (id: string): Promise<ApiResponse<Customer>> => {
    return apiClient.get(`/customers/${id}`).then(res => res.data);
  },
  
  createCustomer: async (customerData: CustomerFormValues): Promise<ApiResponse<Customer>> => {
    return apiClient.post('/customers', customerData).then(res => res.data);
  },
  
  updateCustomer: async (id: string, customerData: CustomerFormValues): Promise<ApiResponse<Customer>> => {
    return apiClient.put(`/customers/${id}`, customerData).then(res => res.data);
  },
  
  deleteCustomer: async (id: string): Promise<void> => {
    return apiClient.delete(`/customers/${id}`).then(res => res.data);
  },
};

// Lead API with RBAC
export const leadAPI = {
  getLeads: async (params: { customerId?: string; status?: string } = {}): Promise<ApiResponse<Lead[]>> => {
    const authDataString = await AsyncStorage.getItem('auth_data');
    const authData = authDataString ? JSON.parse(authDataString) : null;
    const currentUser = authData?.user;

    // Check if user has permission to read leads
    if (!hasPermission(currentUser, 'leads', 'read')) {
      throw new Error('Unauthorized: Insufficient permissions to view leads');
    }

    // Apply data filtering based on user role
    const filterQuery = getFilteredQuery(currentUser);
    const combinedParams = { ...params, ...filterQuery };

    return apiClient.get('/leads', { params: combinedParams }).then(res => res.data);
  },
  
  getLeadById: async (id: string): Promise<ApiResponse<Lead>> => {
    const authDataString = await AsyncStorage.getItem('auth_data');
    const authData = authDataString ? JSON.parse(authDataString) : null;
    const currentUser = authData?.user;

    // Check if user has permission to read leads
    if (!hasPermission(currentUser, 'leads', 'read')) {
      throw new Error('Unauthorized: Insufficient permissions to view lead');
    }

    const response = await apiClient.get(`/leads/${id}`).then(res => res.data);
    
    // Check if user can access this specific record
    if (response.success && !canAccessRecord(currentUser, response.data)) {
      throw new Error('Unauthorized: You do not have permission to view this lead');
    }

    return response;
  },
  
  createLead: async (customerId: string, leadData: LeadFormValues): Promise<ApiResponse<Lead>> => {
    const authDataString = await AsyncStorage.getItem('auth_data');
    const authData = authDataString ? JSON.parse(authDataString) : null;
    const currentUser = authData?.user;

    // Check if user has permission to create leads
    if (!hasPermission(currentUser, 'leads', 'create')) {
      throw new Error('Unauthorized: Insufficient permissions to create lead');
    }

    // Add ownership information
    const enrichedData = {
      ...leadData,
      customerId,
      value: parseFloat(leadData.value),
      ownerId: currentUser?.id,
      teamId: currentUser?.teamId,
      assignedTo: currentUser?.id,
      createdBy: currentUser?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return apiClient.post('/leads', enrichedData).then(res => res.data);
  },
  
  updateLead: async (id: string, leadData: LeadFormValues): Promise<ApiResponse<Lead>> => {
    const authDataString = await AsyncStorage.getItem('auth_data');
    const authData = authDataString ? JSON.parse(authDataString) : null;
    const currentUser = authData?.user;

    // Check if user has permission to update leads
    if (!hasPermission(currentUser, 'leads', 'update')) {
      throw new Error('Unauthorized: Insufficient permissions to update lead');
    }

    // Get the existing lead to check ownership
    const existingLead = await apiClient.get(`/leads/${id}`).then(res => res.data.data);
    if (!canAccessRecord(currentUser, existingLead)) {
      throw new Error('Unauthorized: You do not have permission to update this lead');
    }

    // Add update metadata
    const enrichedData = {
      ...leadData,
      value: parseFloat(leadData.value),
      updatedBy: currentUser?.id,
      updatedAt: new Date().toISOString(),
    };

    return apiClient.put(`/leads/${id}`, enrichedData).then(res => res.data);
  },
  
  deleteLead: async (id: string): Promise<void> => {
    const authDataString = await AsyncStorage.getItem('auth_data');
    const authData = authDataString ? JSON.parse(authDataString) : null;
    const currentUser = authData?.user;

    // Check if user has permission to delete leads
    if (!hasPermission(currentUser, 'leads', 'delete')) {
      throw new Error('Unauthorized: Insufficient permissions to delete lead');
    }

    // Get the existing lead to check ownership
    const existingLead = await apiClient.get(`/leads/${id}`).then(res => res.data.data);
    if (!canAccessRecord(currentUser, existingLead)) {
      throw new Error('Unauthorized: You do not have permission to delete this lead');
    }

    return apiClient.delete(`/leads/${id}`).then(res => res.data);
  },

  assignLead: async (id: string, assignToUserId: string): Promise<ApiResponse<Lead>> => {
    const authDataString = await AsyncStorage.getItem('auth_data');
    const authData = authDataString ? JSON.parse(authDataString) : null;
    const currentUser = authData?.user;

    // Only managers and admins can assign leads
    if (!['admin', 'manager'].includes(currentUser?.role || '')) {
      throw new Error('Unauthorized: Insufficient permissions to assign leads');
    }

    // Get the existing lead to check ownership
    const existingLead = await apiClient.get(`/leads/${id}`).then(res => res.data.data);
    if (!canAccessRecord(currentUser, existingLead)) {
      throw new Error('Unauthorized: You do not have permission to modify this lead');
    }

    const enrichedData = {
      assignedTo: assignToUserId,
      updatedBy: currentUser?.id,
      updatedAt: new Date().toISOString(),
    };

    return apiClient.put(`/leads/${id}`, enrichedData).then(res => res.data);
  },
};

// User Management API
export const userAPI = {
  getUsers: async (): Promise<ApiResponse<User[]>> => {
    const authDataString = await AsyncStorage.getItem('auth_data');
    const authData = authDataString ? JSON.parse(authDataString) : null;
    const currentUser = authData?.user;

    // Check if user has permission to read users
    if (!hasPermission(currentUser, 'users', 'read')) {
      throw new Error('Unauthorized: Insufficient permissions to view users');
    }

    // Apply data filtering based on user role
    const filterQuery = getFilteredQuery(currentUser);
    return apiClient.get('/users', { params: filterQuery }).then(res => res.data);
  },

  getUserById: async (id: string): Promise<ApiResponse<User>> => {
    const authDataString = await AsyncStorage.getItem('auth_data');
    const authData = authDataString ? JSON.parse(authDataString) : null;
    const currentUser = authData?.user;

    if (!hasPermission(currentUser, 'users', 'read')) {
      throw new Error('Unauthorized: Insufficient permissions to view user');
    }

    return apiClient.get(`/users/${id}`).then(res => res.data);
  },

  createUser: async (userData: Omit<User, 'id' | 'createdAt' | 'lastLoginAt'>): Promise<ApiResponse<User>> => {
    const authDataString = await AsyncStorage.getItem('auth_data');
    const authData = authDataString ? JSON.parse(authDataString) : null;
    const currentUser = authData?.user;

    if (!hasPermission(currentUser, 'users', 'create')) {
      throw new Error('Unauthorized: Insufficient permissions to create user');
    }

    const enrichedData = {
      ...userData,
      createdBy: currentUser?.id,
      createdAt: new Date().toISOString(),
    };

    return apiClient.post('/users', enrichedData).then(res => res.data);
  },

  updateUser: async (id: string, userData: Partial<User>): Promise<ApiResponse<User>> => {
    const authDataString = await AsyncStorage.getItem('auth_data');
    const authData = authDataString ? JSON.parse(authDataString) : null;
    const currentUser = authData?.user;

    if (!hasPermission(currentUser, 'users', 'update')) {
      throw new Error('Unauthorized: Insufficient permissions to update user');
    }

    const enrichedData = {
      ...userData,
      updatedBy: currentUser?.id,
      updatedAt: new Date().toISOString(),
    };

    return apiClient.put(`/users/${id}`, enrichedData).then(res => res.data);
  },

  deactivateUser: async (id: string): Promise<ApiResponse<User>> => {
    const authDataString = await AsyncStorage.getItem('auth_data');
    const authData = authDataString ? JSON.parse(authDataString) : null;
    const currentUser = authData?.user;

    if (!hasPermission(currentUser, 'users', 'update')) {
      throw new Error('Unauthorized: Insufficient permissions to deactivate user');
    }

    const enrichedData = {
      isActive: false,
      updatedBy: currentUser?.id,
      updatedAt: new Date().toISOString(),
    };

    return apiClient.put(`/users/${id}`, enrichedData).then(res => res.data);
  },
};

// Team Management API
export const teamAPI = {
  getTeams: async (): Promise<ApiResponse<Team[]>> => {
    const authDataString = await AsyncStorage.getItem('auth_data');
    const authData = authDataString ? JSON.parse(authDataString) : null;
    const currentUser = authData?.user;

    if (!hasPermission(currentUser, 'teams', 'read')) {
      throw new Error('Unauthorized: Insufficient permissions to view teams');
    }

    return apiClient.get('/teams').then(res => res.data);
  },

  getTeamById: async (id: string): Promise<ApiResponse<Team>> => {
    const authDataString = await AsyncStorage.getItem('auth_data');
    const authData = authDataString ? JSON.parse(authDataString) : null;
    const currentUser = authData?.user;

    if (!hasPermission(currentUser, 'teams', 'read')) {
      throw new Error('Unauthorized: Insufficient permissions to view team');
    }

    return apiClient.get(`/teams/${id}`).then(res => res.data);
  },

  createTeam: async (teamData: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Team>> => {
    const authDataString = await AsyncStorage.getItem('auth_data');
    const authData = authDataString ? JSON.parse(authDataString) : null;
    const currentUser = authData?.user;

    if (!hasPermission(currentUser, 'teams', 'create')) {
      throw new Error('Unauthorized: Insufficient permissions to create team');
    }

    const enrichedData = {
      ...teamData,
      createdBy: currentUser?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return apiClient.post('/teams', enrichedData).then(res => res.data);
  },

  updateTeam: async (id: string, teamData: Partial<Team>): Promise<ApiResponse<Team>> => {
    const authDataString = await AsyncStorage.getItem('auth_data');
    const authData = authDataString ? JSON.parse(authDataString) : null;
    const currentUser = authData?.user;

    if (!hasPermission(currentUser, 'teams', 'update')) {
      throw new Error('Unauthorized: Insufficient permissions to update team');
    }

    const enrichedData = {
      ...teamData,
      updatedBy: currentUser?.id,
      updatedAt: new Date().toISOString(),
    };

    return apiClient.put(`/teams/${id}`, enrichedData).then(res => res.data);
  },
};

// Dashboard API with RBAC
export const dashboardAPI = {
  getStats: async (): Promise<ApiResponse<DashboardStats>> => {
    const authDataString = await AsyncStorage.getItem('auth_data');
    const authData = authDataString ? JSON.parse(authDataString) : null;
    const currentUser = authData?.user;

    if (!hasPermission(currentUser, 'reports', 'read')) {
      throw new Error('Unauthorized: Insufficient permissions to view dashboard');
    }

    // Apply data filtering for dashboard stats
    const filterQuery = getFilteredQuery(currentUser);
    return apiClient.get('/dashboard/stats', { params: filterQuery }).then(res => res.data);
  },

  getActivityLog: async (params: { page?: number; limit?: number } = {}): Promise<ApiResponse<Activity[]>> => {
    const authDataString = await AsyncStorage.getItem('auth_data');
    const authData = authDataString ? JSON.parse(authDataString) : null;
    const currentUser = authData?.user;

    if (!hasPermission(currentUser, 'activities', 'read')) {
      throw new Error('Unauthorized: Insufficient permissions to view activities');
    }

    const filterQuery = getFilteredQuery(currentUser);
    const combinedParams = { ...params, ...filterQuery };
    return apiClient.get('/activities', { params: combinedParams }).then(res => res.data);
  },
};

export { apiClient };