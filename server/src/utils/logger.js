const { v4: uuidv4 } = require('uuid');
const database = require('../models/database');

/**
 * Log user activity to the database for audit trail
 * @param {Object} activity - Activity object
 * @param {string} activity.type - Type of activity (create, update, delete, login, logout, assign)
 * @param {string} activity.resourceType - Type of resource (user, customer, lead, team)
 * @param {string} activity.resourceId - ID of the resource
 * @param {string} activity.description - Human-readable description
 * @param {string} activity.userId - ID of the user who performed the action
 * @param {Object} [activity.changes] - Object containing the changes made
 * @param {string} [activity.ipAddress] - IP address of the user
 * @param {string} [activity.userAgent] - User agent string
 */
const logActivity = async (activity) => {
  try {
    const activityId = uuidv4();
    const now = new Date().toISOString();

    await database.run(
      `INSERT INTO activities (id, type, resourceType, resourceId, description, changes, userId, ipAddress, userAgent, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        activityId,
        activity.type,
        activity.resourceType,
        activity.resourceId,
        activity.description,
        activity.changes ? JSON.stringify(activity.changes) : null,
        activity.userId,
        activity.ipAddress || null,
        activity.userAgent || null,
        now
      ]
    );

    console.log(`📝 Activity logged: ${activity.type} ${activity.resourceType} by user ${activity.userId}`);
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

/**
 * Get activity logs with filtering and pagination
 * @param {Object} options - Query options
 * @param {string} [options.userId] - Filter by user ID
 * @param {string} [options.resourceType] - Filter by resource type
 * @param {string} [options.resourceId] - Filter by resource ID
 * @param {string} [options.type] - Filter by activity type
 * @param {Date} [options.startDate] - Filter by start date
 * @param {Date} [options.endDate] - Filter by end date
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.limit=50] - Number of items per page
 * @param {string} [options.sortBy='createdAt'] - Sort field
 * @param {string} [options.sortOrder='DESC'] - Sort order
 */
const getActivityLogs = async (options = {}) => {
  try {
    const {
      userId,
      resourceType,
      resourceId,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = options;

    // Build WHERE clause
    const conditions = [];
    const params = [];

    if (userId) {
      conditions.push('a.userId = ?');
      params.push(userId);
    }

    if (resourceType) {
      conditions.push('a.resourceType = ?');
      params.push(resourceType);
    }

    if (resourceId) {
      conditions.push('a.resourceId = ?');
      params.push(resourceId);
    }

    if (type) {
      conditions.push('a.type = ?');
      params.push(type);
    }

    if (startDate) {
      conditions.push('a.createdAt >= ?');
      params.push(startDate.toISOString());
    }

    if (endDate) {
      conditions.push('a.createdAt <= ?');
      params.push(endDate.toISOString());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM activities a
      ${whereClause}
    `;
    
    const { total } = await database.get(countQuery, params);

    // Get paginated results with user information
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT 
        a.*,
        u.name as userName,
        u.email as userEmail
      FROM activities a
      LEFT JOIN users u ON a.userId = u.id
      ${whereClause}
      ORDER BY a.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const activities = await database.all(dataQuery, [...params, limit, offset]);

    // Parse changes JSON for activities that have it
    const processedActivities = activities.map(activity => ({
      ...activity,
      changes: activity.changes ? JSON.parse(activity.changes) : null
    }));

    return {
      activities: processedActivities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting activity logs:', error);
    throw error;
  }
};

/**
 * Get user activity summary
 * @param {string} userId - User ID
 * @param {number} [days=30] - Number of days to look back
 */
const getUserActivitySummary = async (userId, days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const summaryQuery = `
      SELECT 
        type,
        resourceType,
        COUNT(*) as count
      FROM activities
      WHERE userId = ? AND createdAt >= ?
      GROUP BY type, resourceType
      ORDER BY count DESC
    `;

    const summary = await database.all(summaryQuery, [userId, startDate.toISOString()]);

    // Get total activity count
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM activities
      WHERE userId = ? AND createdAt >= ?
    `;

    const { total } = await database.get(totalQuery, [userId, startDate.toISOString()]);

    return {
      summary,
      totalActivities: total,
      period: `${days} days`
    };
  } catch (error) {
    console.error('Error getting user activity summary:', error);
    throw error;
  }
};

/**
 * Clean up old activity logs
 * @param {number} [daysToKeep=90] - Number of days to keep logs
 */
const cleanupOldLogs = async (daysToKeep = 90) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await database.run(
      'DELETE FROM activities WHERE createdAt < ?',
      [cutoffDate.toISOString()]
    );

    console.log(`🧹 Cleaned up ${result.changes} old activity logs (older than ${daysToKeep} days)`);
    return result.changes;
  } catch (error) {
    console.error('Error cleaning up old logs:', error);
    throw error;
  }
};

/**
 * Create an audit trail for record changes
 * @param {Object} options - Audit options
 * @param {string} options.type - Type of operation (create, update, delete)
 * @param {string} options.resourceType - Type of resource
 * @param {string} options.resourceId - ID of the resource
 * @param {Object} options.oldData - Previous state of the record
 * @param {Object} options.newData - New state of the record
 * @param {string} options.userId - User who made the change
 * @param {Object} options.req - Express request object for IP and user agent
 */
const auditRecordChange = async (options) => {
  const { type, resourceType, resourceId, oldData, newData, userId, req } = options;

  let changes = {};
  let description = '';

  switch (type) {
    case 'create':
      changes = { created: newData };
      description = `Created ${resourceType} "${newData.name || newData.title || resourceId}"`;
      break;

    case 'update':
      // Compare old and new data to find changes
      changes = {};
      Object.keys(newData).forEach(key => {
        if (oldData[key] !== newData[key]) {
          changes[key] = {
            from: oldData[key],
            to: newData[key]
          };
        }
      });
      
      const changedFields = Object.keys(changes);
      description = `Updated ${resourceType} "${newData.name || newData.title || resourceId}" - changed: ${changedFields.join(', ')}`;
      break;

    case 'delete':
      changes = { deleted: oldData };
      description = `Deleted ${resourceType} "${oldData.name || oldData.title || resourceId}"`;
      break;

    default:
      description = `${type} ${resourceType} ${resourceId}`;
  }

  await logActivity({
    type,
    resourceType,
    resourceId,
    description,
    changes,
    userId,
    ipAddress: req?.ip,
    userAgent: req?.get('User-Agent')
  });
};

module.exports = {
  logActivity,
  getActivityLogs,
  getUserActivitySummary,
  cleanupOldLogs,
  auditRecordChange
};