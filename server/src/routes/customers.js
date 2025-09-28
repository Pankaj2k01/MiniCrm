const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requirePermission, requireRecordAccess, applyDataFilter } = require('../middleware/rbac');
const customerController = require('../controllers/customerController');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all customers (with RBAC filtering)
router.get('/',
  requirePermission('customers', 'read'),
  applyDataFilter,
  customerController.getCustomers
);

// Get customer by ID (with ownership check)
router.get('/:id',
  requirePermission('customers', 'read'),
  requireRecordAccess('customer'),
  customerController.getCustomerById
);

// Create new customer
router.post('/',
  requirePermission('customers', 'create'),
  customerController.customerValidation,
  customerController.createCustomer
);

// Update customer (with ownership check)
router.put('/:id',
  requirePermission('customers', 'update'),
  requireRecordAccess('customer'),
  customerController.customerValidation,
  customerController.updateCustomer
);

// Delete customer (with ownership check)
router.delete('/:id',
  requirePermission('customers', 'delete'),
  requireRecordAccess('customer'),
  customerController.deleteCustomer
);

module.exports = router;