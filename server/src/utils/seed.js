const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const database = require('../models/database');

// Demo data
const demoTeams = [
  {
    id: 'team-1',
    name: 'Sales Team Alpha',
    description: 'Primary sales team focusing on enterprise clients',
    department: 'Sales',
    isActive: true
  },
  {
    id: 'team-2',
    name: 'Sales Team Beta',
    description: 'Secondary sales team focusing on SMB clients',
    department: 'Sales',
    isActive: true
  },
  {
    id: 'team-3',
    name: 'Marketing Team',
    description: 'Marketing and lead generation team',
    department: 'Marketing',
    isActive: true
  }
];

const demoUsers = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@crm.com',
    password: 'admin123',
    role: 'admin',
    teamId: 'team-1',
    department: 'Management',
    phone: '+1-555-0001',
    isActive: true
  },
  {
    id: '2',
    name: 'John Doe',
    email: 'john@crm.com',
    password: 'user123',
    role: 'sales_rep',
    teamId: 'team-1',
    department: 'Sales',
    phone: '+1-555-0002',
    isActive: true
  },
  {
    id: '3',
    name: 'Sarah Wilson',
    email: 'sarah@crm.com',
    password: 'manager123',
    role: 'manager',
    teamId: 'team-1',
    department: 'Sales',
    phone: '+1-555-0003',
    isActive: true
  },
  {
    id: '4',
    name: 'Mike Johnson',
    email: 'mike@crm.com',
    password: 'sales123',
    role: 'sales_rep',
    teamId: 'team-2',
    department: 'Sales',
    phone: '+1-555-0004',
    isActive: true
  },
  {
    id: '5',
    name: 'Emma Davis',
    email: 'emma@crm.com',
    password: 'marketing123',
    role: 'sales_rep',
    teamId: 'team-3',
    department: 'Marketing',
    phone: '+1-555-0005',
    isActive: true
  }
];

const demoCustomers = [
  {
    id: '1',
    name: 'Acme Corporation',
    email: 'contact@acme.com',
    phone: '+1-555-0123',
    company: 'Acme Corporation',
    status: 'active',
    tags: JSON.stringify(['enterprise', 'priority']),
    notes: 'Important client with multiple projects',
    lastContactDate: new Date('2024-01-15').toISOString(),
    ownerId: '2',
    teamId: 'team-1',
    assignedTo: '2',
    source: 'website',
    value: 150000,
    industry: 'Technology'
  },
  {
    id: '2',
    name: 'TechStart Inc',
    email: 'hello@techstart.com',
    phone: '+1-555-0456',
    company: 'TechStart Inc',
    status: 'active',
    tags: JSON.stringify(['startup', 'tech']),
    notes: 'Growing startup in the tech sector',
    lastContactDate: new Date('2024-01-10').toISOString(),
    ownerId: '3',
    teamId: 'team-1',
    assignedTo: '3',
    source: 'referral',
    value: 75000,
    industry: 'Software'
  },
  {
    id: '3',
    name: 'Global Solutions',
    email: 'info@globalsolutions.com',
    phone: '+1-555-0789',
    company: 'Global Solutions',
    status: 'inactive',
    tags: JSON.stringify(['consulting']),
    notes: 'Consulting firm, currently inactive',
    lastContactDate: new Date('2023-12-20').toISOString(),
    ownerId: '4',
    teamId: 'team-2',
    assignedTo: '4',
    source: 'cold_call',
    value: 25000,
    industry: 'Consulting'
  },
  {
    id: '4',
    name: 'Enterprise Corp',
    email: 'contact@enterprise.com',
    phone: '+1-555-0100',
    company: 'Enterprise Corp',
    status: 'active',
    tags: JSON.stringify(['enterprise', 'long-term']),
    notes: 'Long-term enterprise client',
    lastContactDate: new Date('2024-01-20').toISOString(),
    ownerId: '2',
    teamId: 'team-1',
    assignedTo: '2',
    source: 'trade_show',
    value: 300000,
    industry: 'Manufacturing'
  },
  {
    id: '5',
    name: 'Innovate LLC',
    email: 'team@innovate.com',
    phone: '+1-555-0200',
    company: 'Innovate LLC',
    status: 'prospect',
    tags: JSON.stringify(['prospect', 'high-potential']),
    notes: 'Promising prospect, follow up needed',
    lastContactDate: new Date('2024-01-25').toISOString(),
    ownerId: '5',
    teamId: 'team-3',
    assignedTo: '5',
    source: 'marketing_campaign',
    value: 50000,
    industry: 'Design'
  }
];

const demoLeads = [
  {
    id: '1',
    title: 'Enterprise Software License',
    description: 'Acme Corp needs enterprise software licensing for 500+ users',
    customerId: '1',
    status: 'qualified',
    value: 150000,
    expectedCloseDate: new Date('2024-03-15').toISOString(),
    priority: 'high',
    source: 'website',
    ownerId: '2',
    teamId: 'team-1',
    assignedTo: '2'
  },
  {
    id: '2',
    title: 'Cloud Migration Project',
    description: 'TechStart Inc looking to migrate to cloud infrastructure',
    customerId: '2',
    status: 'proposal',
    value: 75000,
    expectedCloseDate: new Date('2024-02-28').toISOString(),
    priority: 'medium',
    source: 'referral',
    ownerId: '3',
    teamId: 'team-1',
    assignedTo: '3'
  },
  {
    id: '3',
    title: 'Consulting Services',
    description: 'Global Solutions interested in our consulting services',
    customerId: '3',
    status: 'new',
    value: 25000,
    expectedCloseDate: new Date('2024-04-10').toISOString(),
    priority: 'low',
    source: 'cold_call',
    ownerId: '4',
    teamId: 'team-2',
    assignedTo: '4'
  },
  {
    id: '4',
    title: 'Manufacturing System Upgrade',
    description: 'Enterprise Corp wants to upgrade their manufacturing systems',
    customerId: '4',
    status: 'negotiation',
    value: 300000,
    expectedCloseDate: new Date('2024-02-15').toISOString(),
    priority: 'critical',
    source: 'trade_show',
    ownerId: '2',
    teamId: 'team-1',
    assignedTo: '2'
  },
  {
    id: '5',
    title: 'Design Platform License',
    description: 'Innovate LLC needs design platform licensing',
    customerId: '5',
    status: 'new',
    value: 50000,
    expectedCloseDate: new Date('2024-03-30').toISOString(),
    priority: 'medium',
    source: 'marketing_campaign',
    ownerId: '5',
    teamId: 'team-3',
    assignedTo: '5'
  }
];

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Initialize database
    await database.initialize();

    // Disable foreign key constraints temporarily for clearing
    console.log('🧹 Clearing existing data...');
    await database.run('PRAGMA foreign_keys = OFF');
    
    const tablesToClear = ['activities', 'refresh_tokens', 'leads', 'customers', 'users', 'teams'];
    for (const table of tablesToClear) {
      await database.run(`DELETE FROM ${table}`);
      console.log(`   Cleared ${table} table`);
    }
    
    // Re-enable foreign key constraints
    await database.run('PRAGMA foreign_keys = ON');

    // Seed teams
    console.log('🏢 Seeding teams...');
    for (const team of demoTeams) {
      const now = new Date().toISOString();
      await database.run(
        `INSERT INTO teams (id, name, description, department, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [team.id, team.name, team.description, team.department, team.isActive ? 1 : 0, now, now]
      );
      console.log(`   Added team: ${team.name}`);
    }

    // Seed users (hash passwords)
    console.log('👥 Seeding users...');
    for (const user of demoUsers) {
      const hashedPassword = await bcrypt.hash(user.password, config.security.bcryptRounds);
      const now = new Date().toISOString();

      await database.run(
        `INSERT INTO users (id, name, email, password, role, teamId, department, phone, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.name,
          user.email,
          hashedPassword,
          user.role,
          user.teamId,
          user.department,
          user.phone,
          user.isActive ? 1 : 0,
          now,
          now
        ]
      );
      console.log(`   Added user: ${user.name} (${user.email}) - Role: ${user.role}`);
    }

    // Update team managers
    console.log('👔 Setting team managers...');
    await database.run('UPDATE teams SET managerId = ? WHERE id = ?', ['3', 'team-1']); // Sarah as manager
    await database.run('UPDATE teams SET managerId = ? WHERE id = ?', ['4', 'team-2']); // Mike as manager
    await database.run('UPDATE teams SET managerId = ? WHERE id = ?', ['5', 'team-3']); // Emma as manager

    // Seed customers
    console.log('🏢 Seeding customers...');
    for (const customer of demoCustomers) {
      const now = new Date().toISOString();
      await database.run(
        `INSERT INTO customers (id, name, email, phone, company, status, tags, notes, lastContactDate, 
                              ownerId, teamId, assignedTo, source, value, industry, createdBy, updatedBy, 
                              createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customer.id,
          customer.name,
          customer.email,
          customer.phone,
          customer.company,
          customer.status,
          customer.tags,
          customer.notes,
          customer.lastContactDate,
          customer.ownerId,
          customer.teamId,
          customer.assignedTo,
          customer.source,
          customer.value,
          customer.industry,
          customer.ownerId, // createdBy
          customer.ownerId, // updatedBy
          now,
          now
        ]
      );
      console.log(`   Added customer: ${customer.name}`);
    }

    // Seed leads
    console.log('🎯 Seeding leads...');
    for (const lead of demoLeads) {
      const now = new Date().toISOString();
      await database.run(
        `INSERT INTO leads (id, title, description, customerId, status, value, expectedCloseDate, 
                           priority, source, ownerId, teamId, assignedTo, createdBy, updatedBy, 
                           createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lead.id,
          lead.title,
          lead.description,
          lead.customerId,
          lead.status,
          lead.value,
          lead.expectedCloseDate,
          lead.priority,
          lead.source,
          lead.ownerId,
          lead.teamId,
          lead.assignedTo,
          lead.ownerId, // createdBy
          lead.ownerId, // updatedBy
          now,
          now
        ]
      );
      console.log(`   Added lead: ${lead.title}`);
    }

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n🔐 Demo Login Credentials:');
    console.log('   Admin:     admin@crm.com / admin123');
    console.log('   Manager:   sarah@crm.com / manager123');
    console.log('   Sales Rep: john@crm.com / user123');
    console.log('   Sales Rep: mike@crm.com / sales123');
    console.log('   Sales Rep: emma@crm.com / marketing123');
    console.log('\n📊 Seeded Data Summary:');
    console.log(`   Teams: ${demoTeams.length}`);
    console.log(`   Users: ${demoUsers.length}`);
    console.log(`   Customers: ${demoCustomers.length}`);
    console.log(`   Leads: ${demoLeads.length}`);

    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await database.close();
    process.exit(1);
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };