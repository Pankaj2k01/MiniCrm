const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../config');

class Database {
  constructor() {
    this.db = null;
  }

  async initialize() {
    try {
      // Ensure data directory exists
      const dbDir = path.dirname(config.database.path);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Create database connection
      this.db = new sqlite3.Database(config.database.path, (err) => {
        if (err) {
          console.error('❌ Error opening database:', err.message);
          process.exit(1);
        }
        console.log('✅ Connected to SQLite database');
      });

      // Enable foreign keys
      await this.run('PRAGMA foreign_keys = ON');
      
      // Create tables
      await this.createTables();
      
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      process.exit(1);
    }
  }

  async createTables() {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'sales_rep' CHECK (role IN ('admin', 'manager', 'sales_rep')),
        teamId TEXT,
        department TEXT,
        phone TEXT,
        isActive BOOLEAN DEFAULT 1,
        loginAttempts INTEGER DEFAULT 0,
        lockUntil INTEGER,
        createdBy TEXT,
        updatedBy TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        lastLoginAt TEXT,
        FOREIGN KEY (teamId) REFERENCES teams(id),
        FOREIGN KEY (createdBy) REFERENCES users(id),
        FOREIGN KEY (updatedBy) REFERENCES users(id)
      )`,

      // Teams table
      `CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        managerId TEXT,
        department TEXT,
        isActive BOOLEAN DEFAULT 1,
        createdBy TEXT,
        updatedBy TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (managerId) REFERENCES users(id),
        FOREIGN KEY (createdBy) REFERENCES users(id),
        FOREIGN KEY (updatedBy) REFERENCES users(id)
      )`,

      // Customers table
      `CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        company TEXT,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
        tags TEXT, -- JSON array as string
        notes TEXT,
        lastContactDate TEXT,
        ownerId TEXT NOT NULL,
        teamId TEXT,
        assignedTo TEXT,
        source TEXT,
        value REAL,
        industry TEXT,
        createdBy TEXT,
        updatedBy TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ownerId) REFERENCES users(id),
        FOREIGN KEY (teamId) REFERENCES teams(id),
        FOREIGN KEY (assignedTo) REFERENCES users(id),
        FOREIGN KEY (createdBy) REFERENCES users(id),
        FOREIGN KEY (updatedBy) REFERENCES users(id)
      )`,

      // Leads table
      `CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        customerId TEXT NOT NULL,
        status TEXT DEFAULT 'new' CHECK (status IN ('new', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
        value REAL NOT NULL DEFAULT 0,
        expectedCloseDate TEXT,
        priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        source TEXT,
        ownerId TEXT NOT NULL,
        teamId TEXT,
        assignedTo TEXT,
        createdBy TEXT,
        updatedBy TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (ownerId) REFERENCES users(id),
        FOREIGN KEY (teamId) REFERENCES teams(id),
        FOREIGN KEY (assignedTo) REFERENCES users(id),
        FOREIGN KEY (createdBy) REFERENCES users(id),
        FOREIGN KEY (updatedBy) REFERENCES users(id)
      )`,

      // Activities table (audit trail)
      `CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('create', 'update', 'delete', 'login', 'logout', 'assign')),
        resourceType TEXT NOT NULL CHECK (resourceType IN ('user', 'customer', 'lead', 'team')),
        resourceId TEXT NOT NULL,
        description TEXT NOT NULL,
        changes TEXT, -- JSON string of changes
        userId TEXT NOT NULL,
        ipAddress TEXT,
        userAgent TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )`,

      // Refresh tokens table
      `CREATE TABLE IF NOT EXISTS refresh_tokens (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        token TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_team ON users(teamId)',
      'CREATE INDEX IF NOT EXISTS idx_customers_owner ON customers(ownerId)',
      'CREATE INDEX IF NOT EXISTS idx_customers_team ON customers(teamId)',
      'CREATE INDEX IF NOT EXISTS idx_leads_customer ON leads(customerId)',
      'CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(ownerId)',
      'CREATE INDEX IF NOT EXISTS idx_leads_team ON leads(teamId)',
      'CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(userId)',
      'CREATE INDEX IF NOT EXISTS idx_activities_resource ON activities(resourceType, resourceId)',
      'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(userId)'
    ];

    for (const index of indexes) {
      await this.run(index);
    }
  }

  // Promisify database operations
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// Export singleton instance
const database = new Database();
module.exports = database;