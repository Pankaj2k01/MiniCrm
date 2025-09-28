const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const database = require('../models/database');
const { buildWhereClause } = require('../middleware/rbac');
const { auditRecordChange } = require('../utils/logger');

// Validation rules for lead
const leadValidation = [
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('description').optional().trim(),
  body('customerId').notEmpty().withMessage('Customer ID is required'),
  body('status').optional().isIn(['new', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']).withMessage('Invalid status'),
  body('value').optional().isNumeric().withMessage('Value must be a number'),
  body('expectedCloseDate').optional().isISO8601().withMessage('Valid date is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
  body('source').optional().trim()
];

// Get all leads with filtering and pagination
const getLeads = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, priority, customerId } = req.query;
    const offset = (page - 1) * limit;

    // Build base WHERE conditions
    let baseWhere = '';
    let params = [];

    if (search) {
      baseWhere = '(title LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      const statusCondition = baseWhere ? ' AND status = ?' : 'status = ?';
      baseWhere += statusCondition;
      params.push(status);
    }

    if (priority) {
      const priorityCondition = baseWhere ? ' AND priority = ?' : 'priority = ?';
      baseWhere += priorityCondition;
      params.push(priority);
    }

    if (customerId) {
      const customerCondition = baseWhere ? ' AND customerId = ?' : 'customerId = ?';
      baseWhere += customerCondition;
      params.push(customerId);
    }

    // Apply RBAC filtering
    const { whereClause, params: finalParams } = buildWhereClause(
      baseWhere,
      req.dataFilter,
      params
    );

    // Get total count (use alias for consistency)
    const countQuery = `SELECT COUNT(*) as total FROM leads l ${whereClause}`;
    const { total } = await database.get(countQuery, finalParams);

    // Get leads with pagination
    const leadsQuery = `
      SELECT 
        l.*,
        c.name as customerName,
        c.company as customerCompany,
        u.name as ownerName,
        t.name as teamName,
        au.name as assignedUserName
      FROM leads l
      LEFT JOIN customers c ON l.customerId = c.id
      LEFT JOIN users u ON l.ownerId = u.id
      LEFT JOIN teams t ON l.teamId = t.id
      LEFT JOIN users au ON l.assignedTo = au.id
      ${whereClause}
      ORDER BY l.updatedAt DESC
      LIMIT ? OFFSET ?
    `;

    const leads = await database.all(leadsQuery, [...finalParams, limit, offset]);

    res.json({
      success: true,
      data: leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leads'
    });
  }
};

// Get lead by ID
const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;

    const leadQuery = `
      SELECT 
        l.*,
        c.name as customerName,
        c.company as customerCompany,
        u.name as ownerName,
        t.name as teamName,
        au.name as assignedUserName
      FROM leads l
      LEFT JOIN customers c ON l.customerId = c.id
      LEFT JOIN users u ON l.ownerId = u.id
      LEFT JOIN teams t ON l.teamId = t.id
      LEFT JOIN users au ON l.assignedTo = au.id
      WHERE l.id = ?
    `;

    const lead = await database.get(leadQuery, [id]);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('Get lead by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead'
    });
  }
};

// Get leads for a specific customer
const getLeadsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { status, priority } = req.query;

    // Build WHERE conditions
    let baseWhere = 'customerId = ?';
    let params = [customerId];

    if (status) {
      baseWhere += ' AND status = ?';
      params.push(status);
    }

    if (priority) {
      baseWhere += ' AND priority = ?';
      params.push(priority);
    }

    // Apply RBAC filtering
    const { whereClause, params: finalParams } = buildWhereClause(
      baseWhere,
      req.dataFilter,
      params,
      'l'
    );

    const leadsQuery = `
      SELECT 
        l.*,
        c.name as customerName,
        c.company as customerCompany,
        u.name as ownerName,
        t.name as teamName,
        au.name as assignedUserName
      FROM leads l
      LEFT JOIN customers c ON l.customerId = c.id
      LEFT JOIN users u ON l.ownerId = u.id
      LEFT JOIN teams t ON l.teamId = t.id
      LEFT JOIN users au ON l.assignedTo = au.id
      ${whereClause}
      ORDER BY l.updatedAt DESC
    `;

    const leads = await database.all(leadsQuery, finalParams);

    res.json({
      success: true,
      data: leads
    });
  } catch (error) {
    console.error('Get customer leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer leads'
    });
  }
};

// Create new lead
const createLead = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const leadId = uuidv4();
    const now = new Date().toISOString();
    
    const leadData = {
      id: leadId,
      title: req.body.title,
      description: req.body.description || null,
      customerId: req.body.customerId,
      status: req.body.status || 'new',
      value: req.body.value || 0,
      expectedCloseDate: req.body.expectedCloseDate || null,
      priority: req.body.priority || 'medium',
      source: req.body.source || null,
      ownerId: req.user.id,
      teamId: req.user.teamId,
      assignedTo: req.body.assignedTo || req.user.id,
      createdBy: req.user.id,
      updatedBy: req.user.id,
      createdAt: now,
      updatedAt: now
    };

    await database.run(`
      INSERT INTO leads (
        id, title, description, customerId, status, value, expectedCloseDate,
        priority, source, ownerId, teamId, assignedTo, createdBy, updatedBy,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      leadData.id, leadData.title, leadData.description, leadData.customerId,
      leadData.status, leadData.value, leadData.expectedCloseDate, leadData.priority,
      leadData.source, leadData.ownerId, leadData.teamId, leadData.assignedTo,
      leadData.createdBy, leadData.updatedBy, leadData.createdAt, leadData.updatedAt
    ]);

    // Audit trail
    await auditRecordChange({
      type: 'create',
      resourceType: 'lead',
      resourceId: leadId,
      newData: leadData,
      userId: req.user.id,
      req
    });

    // Fetch created lead
    const lead = await database.get(`
      SELECT 
        l.*,
        c.name as customerName,
        c.company as customerCompany,
        u.name as ownerName,
        t.name as teamName,
        au.name as assignedUserName
      FROM leads l
      LEFT JOIN customers c ON l.customerId = c.id
      LEFT JOIN users u ON l.ownerId = u.id
      LEFT JOIN teams t ON l.teamId = t.id
      LEFT JOIN users au ON l.assignedTo = au.id
      WHERE l.id = ?
    `, [leadId]);

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: lead
    });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create lead'
    });
  }
};

// Update lead
const updateLead = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Get existing lead for audit trail
    const existingLead = await database.get('SELECT * FROM leads WHERE id = ?', [id]);
    if (!existingLead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    const now = new Date().toISOString();
    const updateData = {
      title: req.body.title || existingLead.title,
      description: req.body.description !== undefined ? req.body.description : existingLead.description,
      status: req.body.status || existingLead.status,
      value: req.body.value !== undefined ? req.body.value : existingLead.value,
      expectedCloseDate: req.body.expectedCloseDate !== undefined ? req.body.expectedCloseDate : existingLead.expectedCloseDate,
      priority: req.body.priority || existingLead.priority,
      source: req.body.source || existingLead.source,
      assignedTo: req.body.assignedTo || existingLead.assignedTo,
      updatedBy: req.user.id,
      updatedAt: now
    };

    await database.run(`
      UPDATE leads SET
        title = ?, description = ?, status = ?, value = ?, expectedCloseDate = ?,
        priority = ?, source = ?, assignedTo = ?, updatedBy = ?, updatedAt = ?
      WHERE id = ?
    `, [
      updateData.title, updateData.description, updateData.status, updateData.value,
      updateData.expectedCloseDate, updateData.priority, updateData.source,
      updateData.assignedTo, updateData.updatedBy, updateData.updatedAt, id
    ]);

    // Audit trail
    await auditRecordChange({
      type: 'update',
      resourceType: 'lead',
      resourceId: id,
      oldData: existingLead,
      newData: updateData,
      userId: req.user.id,
      req
    });

    // Fetch updated lead
    const lead = await database.get(`
      SELECT 
        l.*,
        c.name as customerName,
        c.company as customerCompany,
        u.name as ownerName,
        t.name as teamName,
        au.name as assignedUserName
      FROM leads l
      LEFT JOIN customers c ON l.customerId = c.id
      LEFT JOIN users u ON l.ownerId = u.id
      LEFT JOIN teams t ON l.teamId = t.id
      LEFT JOIN users au ON l.assignedTo = au.id
      WHERE l.id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Lead updated successfully',
      data: lead
    });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update lead'
    });
  }
};

// Delete lead
const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing lead for audit trail
    const existingLead = await database.get('SELECT * FROM leads WHERE id = ?', [id]);
    if (!existingLead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Delete lead
    await database.run('DELETE FROM leads WHERE id = ?', [id]);

    // Audit trail
    await auditRecordChange({
      type: 'delete',
      resourceType: 'lead',
      resourceId: id,
      oldData: existingLead,
      userId: req.user.id,
      req
    });

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete lead'
    });
  }
};

module.exports = {
  getLeads,
  getLeadById,
  getLeadsByCustomer,
  createLead,
  updateLead,
  deleteLead,
  leadValidation
};