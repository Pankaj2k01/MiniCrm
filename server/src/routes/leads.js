const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requirePermission, requireRecordAccess, applyDataFilter } = require('../middleware/rbac');
const leadController = require('../controllers/leadController');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all leads (with RBAC filtering)
router.get('/',
  requirePermission('leads', 'read'),
  applyDataFilter,
  leadController.getLeads
);

// Get leads for a specific customer
router.get('/customer/:customerId',
  requirePermission('leads', 'read'),
  applyDataFilter,
  leadController.getLeadsByCustomer
);

// Get lead by ID (with ownership check)
router.get('/:id',
  requirePermission('leads', 'read'),
  requireRecordAccess('lead'),
  leadController.getLeadById
);

// Create new lead
router.post('/',
  requirePermission('leads', 'create'),
  leadController.leadValidation,
  leadController.createLead
);

// Update lead (with ownership check)
router.put('/:id',
  requirePermission('leads', 'update'),
  requireRecordAccess('lead'),
  leadController.leadValidation,
  leadController.updateLead
);

// Delete lead (with ownership check)
router.delete('/:id',
  requirePermission('leads', 'delete'),
  requireRecordAccess('lead'),
  leadController.deleteLead
);

module.exports = router;