# 🚀 Mini CRM Secure Backend

A robust, production-ready backend server for the Mini CRM application built with Express.js, SQLite, and comprehensive security features including JWT authentication and Role-Based Access Control (RBAC).

## 🌟 Key Features

### 🔐 Security & Authentication
- **JWT-based Authentication** with access and refresh tokens
- **Role-Based Access Control (RBAC)** with three user roles:
  - **Admin**: Full system access
  - **Manager**: Team-based access
  - **Sales Rep**: Personal records only
- **Secure Password Hashing** using bcrypt
- **Rate Limiting** to prevent abuse
- **CORS Configuration** for secure cross-origin requests
- **Security Headers** with helmet.js
- **Account Lockout** after failed login attempts

### 📊 Database & Data Management
- **SQLite Database** with foreign key constraints
- **Database Seeding** with demo data
- **Audit Trail System** for all data changes
- **Automatic Database Initialization**
- **Transaction Support** for data consistency

### 🔧 Technical Features
- **Express.js** server with middleware architecture
- **Input Validation** with express-validator
- **Error Handling** with proper HTTP status codes
- **Request Logging** with detailed audit trails
- **Compression** for optimized responses
- **Graceful Shutdown** handling

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Navigate to server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.template .env
   # Edit .env with your configuration
   ```

4. **Initialize database with demo data**
   ```bash
   npm run seed
   ```

5. **Start the server**
   ```bash
   npm start
   ```

The server will start on `http://localhost:3001` by default.

## 📋 Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start with nodemon for development
- `npm run seed` - Initialize database with demo data
- `npm run test` - Run test suite (when implemented)

## 🏗️ Project Structure

```
server/
├── src/
│   ├── controllers/           # Route controllers with business logic
│   │   ├── authController.js    # Authentication & user management
│   │   ├── customerController.js # Customer CRUD with RBAC
│   │   └── leadController.js     # Lead CRUD with RBAC
│   ├── middleware/           # Express middleware
│   │   ├── auth.js             # JWT authentication middleware
│   │   ├── rbac.js            # Role-based access control
│   │   └── security.js        # Security headers & rate limiting
│   ├── models/              # Database models & connection
│   │   └── database.js        # SQLite database setup
│   ├── routes/              # API route definitions
│   │   ├── auth.js           # Authentication routes
│   │   ├── customers.js      # Customer management routes
│   │   └── leads.js          # Lead management routes
│   ├── utils/               # Utility functions
│   │   ├── logger.js         # Audit logging system
│   │   └── seed.js           # Database seeding
│   ├── config.js            # Server configuration
│   └── server.js            # Main server file
├── package.json             # Dependencies & scripts
├── .env.template           # Environment variables template
└── README.md              # This file
```

## 🔐 Authentication & Authorization

### JWT Token System
- **Access Tokens**: Short-lived (15 minutes) for API requests
- **Refresh Tokens**: Long-lived (7 days) for token renewal
- **Secure Storage**: Tokens stored in database with expiration

### User Roles & Permissions

| Role | Customers | Leads | Users | Teams | Activities |
|------|-----------|-------|-------|-------|------------|
| **Admin** | Full CRUD | Full CRUD | Full CRUD | Full CRUD | Full CRUD |
| **Manager** | Team CRUD | Team CRUD | Read Only | Read/Update | Team CRUD |
| **Sales Rep** | Own CRUD | Own CRUD | Read Only | Read Only | Own CRUD |

### RBAC Implementation
- **Data Filtering**: Automatic filtering based on user role
- **Record Ownership**: Users can only access their own records (sales reps)
- **Team Hierarchy**: Managers can access team member records
- **Admin Override**: Admins have unrestricted access

## 📊 Database Schema

### Users
- Authentication and user profile information
- Role assignment and team membership
- Account security settings

### Teams
- Team organization and hierarchy
- Manager assignments
- Department categorization

### Customers
- Customer contact information
- Ownership and assignment tracking
- Industry and value classification

### Leads
- Sales opportunity tracking
- Status progression management
- Value and priority assignment

### Refresh Tokens
- JWT refresh token management
- Secure token storage and validation

### Activities (Audit Trail)
- Complete action logging
- Change tracking with before/after states
- User attribution and timestamps

## 🔧 Configuration

### Environment Variables (.env)

```env
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=localhost

# Security
JWT_SECRET=your-super-secure-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# CORS
CORS_ORIGIN=http://localhost:8081

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Database
DATABASE_PATH=./crm_database.db
```

### Security Configuration
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configured for frontend origin
- **Security Headers**: Helmet.js with secure defaults
- **Password Policy**: Minimum 6 characters (configurable)

## 📡 API Endpoints

### Authentication (Public)
```
POST /api/auth/login         - User login
POST /api/auth/register      - User registration (admin only)
POST /api/auth/refresh-token - Refresh access token
POST /api/auth/logout        - Logout user
GET  /api/auth/profile       - Get user profile
```

### Customers (Protected)
```
GET    /api/customers        - List customers (RBAC filtered)
GET    /api/customers/:id    - Get customer details
POST   /api/customers        - Create customer
PUT    /api/customers/:id    - Update customer
DELETE /api/customers/:id    - Delete customer
```

### Leads (Protected)
```
GET    /api/leads                    - List leads (RBAC filtered)
GET    /api/leads/customer/:id       - Get customer leads
GET    /api/leads/:id               - Get lead details
POST   /api/leads                   - Create lead
PUT    /api/leads/:id               - Update lead
DELETE /api/leads/:id               - Delete lead
```

### System
```
GET /health                  - Health check
GET /api                    - API information
```

## 🧪 Demo Data

The seeding script creates:
- **3 Teams**: Sales Alpha, Sales Beta, Marketing
- **5 Users**: 1 Admin, 1 Manager, 3 Sales Reps
- **5 Customers**: Various industries and team assignments
- **5 Leads**: Different statuses and ownership

### Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@crm.com | admin123 |
| Manager | sarah@crm.com | manager123 |
| Sales Rep | john@crm.com | user123 |
| Sales Rep | mike@crm.com | sales123 |
| Sales Rep | emma@crm.com | marketing123 |

## 🔍 Audit Trail

The system maintains a comprehensive audit trail:
- **User Actions**: Login, logout, profile changes
- **Data Changes**: Create, update, delete operations
- **Before/After States**: Complete change tracking
- **Timestamps**: Precise action timing
- **User Attribution**: Who performed each action

## 🛡️ Security Best Practices

1. **Environment Variables**: Never commit secrets
2. **Password Hashing**: bcrypt with configurable rounds
3. **JWT Security**: Short-lived access tokens
4. **Rate Limiting**: Prevent brute force attacks
5. **Input Validation**: Comprehensive request validation
6. **SQL Injection**: Parameterized queries only
7. **CORS**: Strict origin control

## 🚀 Deployment

### Production Checklist
- [ ] Set strong JWT secrets
- [ ] Configure production database
- [ ] Set up HTTPS/TLS
- [ ] Configure reverse proxy (nginx)
- [ ] Set up monitoring and logging
- [ ] Configure backups
- [ ] Set appropriate CORS origins

### Docker Deployment (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3001
CMD ["npm", "start"]
```

## 📊 Performance Considerations

- **Database Indexing**: Key fields indexed for performance
- **Query Optimization**: Efficient JOIN operations
- **Caching**: Consider Redis for session storage in production
- **Connection Pooling**: SQLite with connection management
- **Response Compression**: Gzip enabled

## 🤝 Contributing

1. Follow existing code style and structure
2. Add comprehensive error handling
3. Write unit tests for new features
4. Update documentation for API changes
5. Follow security best practices

## 📄 License

This project is licensed under the MIT License.