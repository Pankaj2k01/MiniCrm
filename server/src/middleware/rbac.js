const database = require('../models/database');

// Role permissions matrix
const ROLE_PERMISSIONS = {
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

// Check if user has permission for resource and action
const hasPermission = (user, resource, permission) => {
  if (!user || !user.role) return false;
  
  const rolePermissions = ROLE_PERMISSIONS[user.role];
  if (!rolePermissions) return false;
  
  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) return false;
  
  return resourcePermissions.includes(permission);
};

// Check if user can access a specific record based on ownership
const canAccessRecord = (user, record) => {
  if (!user || !record) return false;
  
  // Admin can access everything
  if (user.role === 'admin') return true;
  
  // Manager can access team records
  if (user.role === 'manager' && record.teamId === user.teamId) return true;
  
  // Users can access their own records
  if (record.ownerId === user.id) return true;
  
  // Users can access records assigned to them
  if (record.assignedTo === user.id) return true;
  
  return false;
};

// Get data filter query based on user role
const getDataFilter = (user) => {
  if (!user) return null;
  
  // Admin sees everything
  if (user.role === 'admin') return {};
  
  // Manager sees team data
  if (user.role === 'manager') return { teamId: user.teamId };
  
  // Sales rep sees only own data
  return { ownerId: user.id };
};

// Middleware to check permissions
const requirePermission = (resource, permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!hasPermission(req.user, resource, permission)) {
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required: ${permission} on ${resource}`
      });
    }

    next();
  };
};

// Middleware to check record ownership
const requireRecordAccess = (resourceType) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const resourceId = req.params.id;
    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: 'Resource ID required'
      });
    }

    try {
      let record;
      
      // Get the record from database
      switch (resourceType) {
        case 'customer':
          record = await database.get(
            'SELECT ownerId, teamId, assignedTo FROM customers WHERE id = ?',
            [resourceId]
          );
          break;
        case 'lead':
          record = await database.get(
            'SELECT ownerId, teamId, assignedTo FROM leads WHERE id = ?',
            [resourceId]
          );
          break;
        case 'user':
          record = await database.get(
            'SELECT id as ownerId, teamId FROM users WHERE id = ?',
            [resourceId]
          );
          break;
        case 'team':
          record = await database.get(
            'SELECT managerId as ownerId FROM teams WHERE id = ?',
            [resourceId]
          );
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid resource type'
          });
      }

      if (!record) {
        return res.status(404).json({
          success: false,
          message: `${resourceType} not found`
        });
      }

      if (!canAccessRecord(req.user, record)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this resource'
        });
      }

      // Add record to request for use in controller
      req.record = record;
      next();
    } catch (error) {
      console.error('Record access check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking record access'
      });
    }
  };
};

// Middleware to apply data filtering to queries
const applyDataFilter = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const filter = getDataFilter(req.user);
  req.dataFilter = filter;
  next();
};

// Utility function to build WHERE clause for data filtering
const buildWhereClause = (baseWhere = '', filter = {}, params = [], tableAlias = 'l') => {
  const conditions = [];
  const newParams = [...params];

  if (baseWhere) {
    conditions.push(baseWhere);
  }

  if (filter.ownerId) {
    conditions.push(`${tableAlias}.ownerId = ?`);
    newParams.push(filter.ownerId);
  }

  if (filter.teamId) {
    conditions.push(`${tableAlias}.teamId = ?`);
    newParams.push(filter.teamId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params: newParams };
};

module.exports = {
  hasPermission,
  canAccessRecord,
  getDataFilter,
  requirePermission,
  requireRecordAccess,
  applyDataFilter,
  buildWhereClause,
  ROLE_PERMISSIONS
};