// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'sales_rep';
  teamId?: string;
  department?: string;
  phone?: string;
  avatar?: string;
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// Customer Types
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  industry?: string;
  size?: 'Small' | 'Medium' | 'Large';
  address?: string;
  website?: string;
  status?: 'Active' | 'Inactive' | 'Prospect';
  priority?: 'Low' | 'Medium' | 'High';
  source?: string;
  ownerId?: string;
  assignedTo?: string;
  teamId?: string;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CustomerState {
  customers: Customer[];
  currentCustomer: Customer | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// Lead Types
export type LeadStatus = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface Lead {
  id: string;
  title: string;
  description: string;
  status: LeadStatus;
  priority?: 'Low' | 'Medium' | 'High';
  value: number;
  probability?: number;
  expectedCloseDate?: string;
  stage?: string;
  source?: string;
  customerId: string;
  ownerId?: string;
  assignedTo?: string;
  teamId?: string;
  tags?: string[];
  notes?: string;
  lastContactDate?: string;
  nextFollowUp?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface LeadState {
  leads: Lead[];
  filteredLeads: Lead[];
  isLoading: boolean;
  error: string | null;
  statusFilter: LeadStatus | 'All';
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Customers: undefined;
  Profile: undefined;
};

export type CustomerStackParamList = {
  CustomerList: undefined;
  CustomerDetails: { customerId: string };
  CustomerForm: { customerId?: string };
  LeadForm: { customerId: string; leadId?: string };
};

// Form Types
export interface CustomerFormValues {
  name: string;
  email: string;
  phone: string;
  company: string;
}

export interface LeadFormValues {
  title: string;
  description: string;
  status: string;
  value: string;
  expectedCloseDate?: string;
  priority?: string;
  source?: string;
}

// Dashboard Types
export interface DashboardStats {
  totalCustomers: number;
  totalLeads: number;
  totalLeadValue: number;
  leadsByStatus: {
    [key in LeadStatus]: number;
  };
}

// Team Types
export interface Team {
  id: string;
  name: string;
  description: string;
  managerId: string;
  members: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// RBAC Types
export type Permission = 'create' | 'read' | 'update' | 'delete' | 'export';
export type Resource = 'customers' | 'leads' | 'users' | 'teams' | 'activities' | 'reports';

export interface RolePermission {
  resource: Resource;
  permissions: Permission[];
}

export interface UserPermissions {
  canAccessRecord: (record: { ownerId?: string; assignedTo?: string; teamId?: string }) => boolean;
  canModifyRecord: (record: { ownerId?: string; assignedTo?: string; teamId?: string }) => boolean;
  hasPermission: (resource: Resource, permission: Permission) => boolean;
  getFilteredQuery: () => Record<string, string>;
}

// Activity Types
export interface Activity {
  id: string;
  type: 'call' | 'meeting' | 'email' | 'note' | 'task';
  subject: string;
  description: string;
  customerId?: string;
  leadId?: string;
  ownerId: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  scheduledAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// Error Types
export interface ApiError {
  message: string;
  status: number;
  data?: any;
}
