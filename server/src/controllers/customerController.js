const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const database = require('../models/database');
const { buildWhereClause } = require('../middleware/rbac');
const { auditRecordChange } = require('../utils/logger');

// Validation rules for customer
const customerValidation = [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
  body('company').optional().trim(),
  body('status').optional().isIn(['active', 'inactive', 'prospect']).withMessage('Invalid status'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('notes').optional().trim(),
  body('value').optional().isNumeric().withMessage('Value must be a number'),
  body('industry').optional().trim(),
  body('source').optional().trim()
];

// Get all customers with filtering and pagination
const getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, industry, source } = req.query;
    const offset = (page - 1) * limit;

    // Build base WHERE conditions
    let baseWhere = '';
    let params = [];

    if (search) {
      baseWhere = '(name LIKE ? OR email LIKE ? OR company LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      const statusCondition = baseWhere ? ' AND status = ?' : 'status = ?';
      baseWhere += statusCondition;
      params.push(status);
    }

    if (industry) {
      const industryCondition = baseWhere ? ' AND industry = ?' : 'industry = ?';
      baseWhere += industryCondition;
      params.push(industry);
    }

    if (source) {
      const sourceCondition = baseWhere ? ' AND source = ?' : 'source = ?';
      baseWhere += sourceCondition;
      params.push(source);
    }

    // Apply RBAC filtering
    const { whereClause, params: finalParams } = buildWhereClause(
      baseWhere,
      req.dataFilter,
      params,
      'c'
    );

    // Get total count (use alias for consistency)
    const countQuery = `SELECT COUNT(*) as total FROM customers c ${whereClause}`;
    const { total } = await database.get(countQuery, finalParams);

    // Get customers with pagination
    const customersQuery = `
      SELECT 
        c.*,
        u.name as ownerName,
        t.name as teamName,
        au.name as assignedUserName
      FROM customers c
      LEFT JOIN users u ON c.ownerId = u.id
      LEFT JOIN teams t ON c.teamId = t.id
      LEFT JOIN users au ON c.assignedTo = au.id
      ${whereClause}
      ORDER BY c.updatedAt DESC
      LIMIT ? OFFSET ?
    `;

    const customers = await database.all(customersQuery, [...finalParams, limit, offset]);

    // Parse tags JSON for each customer
    const processedCustomers = customers.map(customer => ({
      ...customer,
      tags: customer.tags ? JSON.parse(customer.tags) : []
    }));

    res.json({
      success: true,
      data: processedCustomers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers'
    });
  }
};

// Get customer by ID
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customerQuery = `
      SELECT 
        c.*,
        u.name as ownerName,
        t.name as teamName,
        au.name as assignedUserName
      FROM customers c
      LEFT JOIN users u ON c.ownerId = u.id
      LEFT JOIN teams t ON c.teamId = t.id
      LEFT JOIN users au ON c.assignedTo = au.id
      WHERE c.id = ?
    `;

    const customer = await database.get(customerQuery, [id]);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Parse tags JSON
    customer.tags = customer.tags ? JSON.parse(customer.tags) : [];

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Get customer by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer'
    });
  }
};

// Create new customer
const createCustomer = async (req, res) => {
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

    const customerId = uuidv4();
    const now = new Date().toISOString();
    
    const customerData = {
      id: customerId,
      name: req.body.name,
      email: req.body.email || null,
      phone: req.body.phone || null,
      company: req.body.company || req.body.name,
      status: req.body.status || 'active',
      tags: req.body.tags ? JSON.stringify(req.body.tags) : null,
      notes: req.body.notes || null,
      lastContactDate: req.body.lastContactDate || now,
      value: req.body.value || 0,
      industry: req.body.industry || null,
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
      INSERT INTO customers (
        id, name, email, phone, company, status, tags, notes, lastContactDate,
        value, industry, source, ownerId, teamId, assignedTo, createdBy, updatedBy,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      customerData.id, customerData.name, customerData.email, customerData.phone,
      customerData.company, customerData.status, customerData.tags, customerData.notes,
      customerData.lastContactDate, customerData.value, customerData.industry,
      customerData.source, customerData.ownerId, customerData.teamId, customerData.assignedTo,
      customerData.createdBy, customerData.updatedBy, customerData.createdAt, customerData.updatedAt
    ]);

    // Audit trail
    await auditRecordChange({
      type: 'create',
      resourceType: 'customer',
      resourceId: customerId,
      newData: customerData,
      userId: req.user.id,
      req
    });

    // Fetch created customer
    const customer = await database.get(`
      SELECT 
        c.*,
        u.name as ownerName,
        t.name as teamName,
        au.name as assignedUserName
      FROM customers c
      LEFT JOIN users u ON c.ownerId = u.id
      LEFT JOIN teams t ON c.teamId = t.id
      LEFT JOIN users au ON c.assignedTo = au.id
      WHERE c.id = ?
    `, [customerId]);

    customer.tags = customer.tags ? JSON.parse(customer.tags) : [];

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customer'
    });
  }
};

// Update customer
const updateCustomer = async (req, res) => {
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

    // Get existing customer for audit trail
    const existingCustomer = await database.get('SELECT * FROM customers WHERE id = ?', [id]);
    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const now = new Date().toISOString();
    const updateData = {
      name: req.body.name || existingCustomer.name,
      email: req.body.email || existingCustomer.email,
      phone: req.body.phone || existingCustomer.phone,
      company: req.body.company || existingCustomer.company,
      status: req.body.status || existingCustomer.status,
      tags: req.body.tags ? JSON.stringify(req.body.tags) : existingCustomer.tags,
      notes: req.body.notes !== undefined ? req.body.notes : existingCustomer.notes,
      lastContactDate: req.body.lastContactDate || existingCustomer.lastContactDate,
      value: req.body.value !== undefined ? req.body.value : existingCustomer.value,
      industry: req.body.industry || existingCustomer.industry,
      source: req.body.source || existingCustomer.source,
      assignedTo: req.body.assignedTo || existingCustomer.assignedTo,
      updatedBy: req.user.id,
      updatedAt: now
    };

    await database.run(`
      UPDATE customers SET
        name = ?, email = ?, phone = ?, company = ?, status = ?, tags = ?,
        notes = ?, lastContactDate = ?, value = ?, industry = ?, source = ?,
        assignedTo = ?, updatedBy = ?, updatedAt = ?
      WHERE id = ?
    `, [
      updateData.name, updateData.email, updateData.phone, updateData.company,
      updateData.status, updateData.tags, updateData.notes, updateData.lastContactDate,
      updateData.value, updateData.industry, updateData.source, updateData.assignedTo,
      updateData.updatedBy, updateData.updatedAt, id
    ]);

    // Audit trail
    await auditRecordChange({
      type: 'update',
      resourceType: 'customer',
      resourceId: id,
      oldData: existingCustomer,
      newData: updateData,
      userId: req.user.id,
      req
    });

    // Fetch updated customer
    const customer = await database.get(`
      SELECT 
        c.*,
        u.name as ownerName,
        t.name as teamName,
        au.name as assignedUserName
      FROM customers c
      LEFT JOIN users u ON c.ownerId = u.id
      LEFT JOIN teams t ON c.teamId = t.id
      LEFT JOIN users au ON c.assignedTo = au.id
      WHERE c.id = ?
    `, [id]);

    customer.tags = customer.tags ? JSON.parse(customer.tags) : [];

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer'
    });
  }
};

// Delete customer
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing customer for audit trail
    const existingCustomer = await database.get('SELECT * FROM customers WHERE id = ?', [id]);
    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Delete customer (this will cascade to leads due to foreign key)
    await database.run('DELETE FROM customers WHERE id = ?', [id]);

    // Audit trail
    await auditRecordChange({
      type: 'delete',
      resourceType: 'customer',
      resourceId: id,
      oldData: existingCustomer,
      userId: req.user.id,
      req
    });

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer'
    });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  customerValidation
};