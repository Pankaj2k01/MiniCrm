const jsonServer = require('json-server');
const jwt = require('jsonwebtoken');
const server = jsonServer.create();
const router = jsonServer.router('mock-api/db.json');
const middlewares = jsonServer.defaults();

const SECRET_KEY = 'your-secret-key';

// Helper function to create JWT token
const createToken = (payload) => {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: '24h' });
};

// Helper function to verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (err) {
    return null;
  }
};

// Add custom middlewares
server.use(jsonServer.bodyParser);
server.use(middlewares);

// Add authentication middleware for protected routes
server.use((req, res, next) => {
  if (req.path.startsWith('/auth') || req.method === 'OPTIONS') {
    next();
    return;
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
});

// Auth routes
server.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = router.db; // lowdb instance
  
  const user = db.get('users').find({ email, password }).value();
  
  if (!user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid credentials' 
    });
  }
  
  const token = createToken({ 
    id: user.id, 
    email: user.email, 
    role: user.role 
  });
  
  const { password: _, ...userWithoutPassword } = user;
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: userWithoutPassword,
      token
    }
  });
});

server.post('/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  const db = router.db;
  
  // Check if user already exists
  const existingUser = db.get('users').find({ email }).value();
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'User with this email already exists'
    });
  }
  
  // Create new user
  const newUser = {
    id: Date.now().toString(),
    name,
    email,
    password,
    role: 'user',
    createdAt: new Date().toISOString()
  };
  
  db.get('users').push(newUser).write();
  
  const token = createToken({ 
    id: newUser.id, 
    email: newUser.email, 
    role: newUser.role 
  });
  
  const { password: _, ...userWithoutPassword } = newUser;
  
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: userWithoutPassword,
      token
    }
  });
});

// Dashboard stats endpoint
server.get('/dashboard/stats', (req, res) => {
  const db = router.db;
  const customers = db.get('customers').value();
  const leads = db.get('leads').value();
  
  const totalCustomers = customers.length;
  const totalLeads = leads.length;
  const totalLeadValue = leads.reduce((sum, lead) => sum + lead.value, 0);
  
  const leadsByStatus = {
    New: leads.filter(lead => lead.status === 'New').length,
    Contacted: leads.filter(lead => lead.status === 'Contacted').length,
    Converted: leads.filter(lead => lead.status === 'Converted').length,
    Lost: leads.filter(lead => lead.status === 'Lost').length,
  };
  
  res.json({
    success: true,
    data: {
      totalCustomers,
      totalLeads,
      totalLeadValue,
      leadsByStatus
    }
  });
});

// Custom customers endpoint with search and pagination
server.get('/customers', (req, res) => {
  const db = router.db;
  const { page = 1, limit = 10, search = '' } = req.query;
  
  let customers = db.get('customers').value();
  
  // Apply search filter
  if (search) {
    customers = customers.filter(customer => 
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      customer.email.toLowerCase().includes(search.toLowerCase()) ||
      customer.company.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  const total = customers.length;
  const totalPages = Math.ceil(total / parseInt(limit));
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const paginatedCustomers = customers.slice(offset, offset + parseInt(limit));
  
  res.json({
    success: true,
    data: paginatedCustomers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages
    }
  });
});

// Custom leads endpoint with filtering
server.get('/leads', (req, res) => {
  const db = router.db;
  const { customerId, status } = req.query;
  
  let leads = db.get('leads').value();
  
  if (customerId) {
    leads = leads.filter(lead => lead.customerId === customerId);
  }
  
  if (status && status !== 'All') {
    leads = leads.filter(lead => lead.status === status);
  }
  
  res.json({
    success: true,
    data: leads
  });
});

// Use default router for other routes
server.use(router);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`JSON Server is running on port ${PORT}`);
});