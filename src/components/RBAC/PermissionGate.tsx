import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { hasPermission, canAccessRecord } from '../../services/api';
import { Resource, Permission } from '../../types';

interface PermissionGateProps {
  children: React.ReactNode;
  resource: Resource;
  permission: Permission;
  record?: { ownerId?: string; assignedTo?: string; teamId?: string };
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

/**
 * PermissionGate - Conditionally renders children based on user permissions
 * 
 * @param children - The content to render if user has permission
 * @param resource - The resource type (customers, leads, users, etc.)
 * @param permission - The permission type (create, read, update, delete)
 * @param record - Optional record data for ownership checks
 * @param fallback - Optional fallback content to render if no permission
 * @param showFallback - Whether to show fallback or nothing when no permission
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  resource,
  permission,
  record,
  fallback,
  showFallback = false,
}) => {
  const { user } = useSelector((state: RootState) => state.auth);

  // Check basic permission
  const hasBasicPermission = hasPermission(user, resource, permission);
  
  // If no basic permission, return fallback or nothing
  if (!hasBasicPermission) {
    return showFallback && fallback ? <>{fallback}</> : null;
  }

  // If record is provided, also check record-level access
  if (record) {
    const hasRecordAccess = canAccessRecord(user, record);
    if (!hasRecordAccess) {
      return showFallback && fallback ? <>{fallback}</> : null;
    }
  }

  return <>{children}</>;
};

// Convenience components for common use cases
export const CanCreate: React.FC<Omit<PermissionGateProps, 'permission'>> = (props) => (
  <PermissionGate {...props} permission="create" />
);

export const CanRead: React.FC<Omit<PermissionGateProps, 'permission'>> = (props) => (
  <PermissionGate {...props} permission="read" />
);

export const CanUpdate: React.FC<Omit<PermissionGateProps, 'permission'>> = (props) => (
  <PermissionGate {...props} permission="update" />
);

export const CanDelete: React.FC<Omit<PermissionGateProps, 'permission'>> = (props) => (
  <PermissionGate {...props} permission="delete" />
);

// Role-based convenience components
interface RoleGateProps {
  children: React.ReactNode;
  roles: string[];
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export const RoleGate: React.FC<RoleGateProps> = ({
  children,
  roles,
  fallback,
  showFallback = false,
}) => {
  const { user } = useSelector((state: RootState) => state.auth);

  const hasRequiredRole = user && roles.includes(user.role);

  if (!hasRequiredRole) {
    return showFallback && fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

export const AdminOnly: React.FC<Omit<RoleGateProps, 'roles'>> = (props) => (
  <RoleGate {...props} roles={['admin']} />
);

export const ManagerOrAdmin: React.FC<Omit<RoleGateProps, 'roles'>> = (props) => (
  <RoleGate {...props} roles={['admin', 'manager']} />
);

export const SalesOnly: React.FC<Omit<RoleGateProps, 'roles'>> = (props) => (
  <RoleGate {...props} roles={['admin', 'manager', 'sales_rep']} />
);