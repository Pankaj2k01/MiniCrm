import { User } from '../types';

export type Permission = 'create' | 'read' | 'update' | 'delete' | 'export';
export type Resource = 'customers' | 'leads' | 'users' | 'teams' | 'activities' | 'reports';

// Role-based permissions matrix
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

/**
 * Check if user has specific permission for a resource
 */
export const hasPermission = (
  user: User | null,
  resource: Resource,
  permission: Permission
): boolean => {
  if (!user) return false;
  
  const rolePermissions = ROLE_PERMISSIONS[user.role];
  if (!rolePermissions) return false;
  
  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) return false;
  
  return resourcePermissions.includes(permission);
};

/**
 * Check if user can access a specific record (ownership-based)
 */
export const canAccessRecord = (
  user: User | null,
  record: { ownerId?: string; assignedTo?: string; teamId?: string },
  permission: Permission = 'read'
): boolean => {
  if (!user) return false;
  
  // Admin can access all records
  if (user.role === 'admin') return true;
  
  // Manager can access team records
  if (user.role === 'manager' && record.teamId === user.teamId) return true;
  
  // Owner can access their own records
  if (record.ownerId === user.id) return true;
  
  // Assigned user can access assigned records
  if (record.assignedTo === user.id) return true;
  
  return false;
};

/**
 * Check if user can modify a specific record
 */
export const canModifyRecord = (
  user: User | null,
  record: { ownerId?: string; assignedTo?: string; teamId?: string }
): boolean => {
  if (!user) return false;
  
  // Admin can modify all records
  if (user.role === 'admin') return true;
  
  // Manager can modify team records
  if (user.role === 'manager' && record.teamId === user.teamId) return true;
  
  // Owner can modify their own records
  if (record.ownerId === user.id) return true;
  
  return false;
};

/**
 * Get filtered query parameters based on user role and permissions
 */
export const getFilteredQuery = (user: User | null): Record<string, string> => {
  if (!user) return {};
  
  // Admin sees all records
  if (user.role === 'admin') return {};
  
  // Manager sees team records
  if (user.role === 'manager') {
    return { teamId: user.teamId || '' };
  }
  
  // Sales rep sees only their own records
  return { ownerId: user.id };
};

/**
 * Check if user can perform bulk actions
 */
export const canPerformBulkActions = (user: User | null): boolean => {
  if (!user) return false;
  return ['admin', 'manager'].includes(user.role);
};

/**
 * Check if user can reassign records to other users
 */
export const canReassignRecords = (user: User | null): boolean => {
  if (!user) return false;
  return ['admin', 'manager'].includes(user.role);
};

/**
 * Check if user can view team analytics
 */
export const canViewTeamAnalytics = (user: User | null): boolean => {
  if (!user) return false;
  return ['admin', 'manager'].includes(user.role);
};

/**
 * Get role display name
 */
export const getRoleDisplayName = (role: string): string => {
  const roleNames: Record<string, string> = {
    admin: 'Administrator',
    manager: 'Sales Manager',
    sales_rep: 'Sales Representative',
  };
  return roleNames[role] || role;
};

/**
 * Get role color for UI
 */
export const getRoleColor = (role: string): string => {
  const roleColors: Record<string, string> = {
    admin: '#f44336', // red
    manager: '#ff9800', // orange
    sales_rep: '#4caf50', // green
  };
  return roleColors[role] || '#9e9e9e';
};

/**
 * Check if current user can manage another user
 */
export const canManageUser = (currentUser: User | null, targetUser: User): boolean => {
  if (!currentUser) return false;
  
  // Admin can manage all users
  if (currentUser.role === 'admin') return true;
  
  // Manager can manage sales reps in their team
  if (currentUser.role === 'manager' && 
      targetUser.role === 'sales_rep' && 
      targetUser.teamId === currentUser.teamId) {
    return true;
  }
  
  return false;
};