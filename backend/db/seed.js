const { pool, createDBIfNotExists } = require('./index');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const createTables = async () => {
  await createDBIfNotExists();
  const connection = await pool.getConnection();
  try {
    await connection.query('START TRANSACTION');

    await connection.query(`SET FOREIGN_KEY_CHECKS = 0;`);
    await connection.query(`DROP TABLE IF EXISTS transporter_payments;`);
    await connection.query(`DROP TABLE IF EXISTS activity_logs;`);
    await connection.query(`DROP TABLE IF EXISTS user_language_preferences;`);
    await connection.query(`DROP TABLE IF EXISTS payments;`);
    await connection.query(`DROP TABLE IF EXISTS notifications;`);
    await connection.query(`DROP TABLE IF EXISTS gps_logs;`);
    await connection.query(`DROP TABLE IF EXISTS journeys;`);
    await connection.query(`DROP TABLE IF EXISTS invoices;`);
    await connection.query(`DROP TABLE IF EXISTS order_items;`);
    await connection.query(`DROP TABLE IF EXISTS orders;`);
    await connection.query(`DROP TABLE IF EXISTS bids;`);
    await connection.query(`DROP TABLE IF EXISTS inventory;`);
    await connection.query(`DROP TABLE IF EXISTS products;`);
    await connection.query(`DROP TABLE IF EXISTS transporters;`);
    await connection.query(`DROP TABLE IF EXISTS users;`);
    await connection.query(`SET FOREIGN_KEY_CHECKS = 1;`);

    // Users table
    await connection.query(`
      CREATE TABLE users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin','farmer','transporter','outlet','retailer') NOT NULL,
        province VARCHAR(50),
        phone VARCHAR(20),
        outlet_id VARCHAR(36),
        is_active BOOLEAN DEFAULT true,
        is_blocked BOOLEAN DEFAULT false,
        blocked_reason VARCHAR(255),
        language ENUM('en','si','ta') DEFAULT 'en',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Transporters metadata table
    await connection.query(`
      CREATE TABLE transporters (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        province VARCHAR(50),
        vehicle_number VARCHAR(30),
        account_status ENUM('active','inactive') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Products table
    await connection.query(`
      CREATE TABLE products (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50),
        unit VARCHAR(20),
        price_per_unit DECIMAL(10,2),
        is_trending BOOLEAN DEFAULT false,
        province VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Inventory table
    await connection.query(`
      CREATE TABLE inventory (
        id VARCHAR(36) PRIMARY KEY,
        owner_id VARCHAR(36),
        product_id VARCHAR(36),
        quantity DECIMAL(10,2) DEFAULT 0,
        low_stock_threshold DECIMAL(10,2) DEFAULT 100,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
    `);

    // Bids table
    await connection.query(`
      CREATE TABLE bids (
        id VARCHAR(36) PRIMARY KEY,
        admin_id VARCHAR(36),
        material_name VARCHAR(100) NOT NULL,
        quantity DECIMAL(10,2),
        unit VARCHAR(20),
        bid_amount DECIMAL(10,2),
        bid_type VARCHAR(20),
        status ENUM('open','accepted','delivered','paid') DEFAULT 'open',
        accepted_by VARCHAR(36),
        delivery_confirmed_by VARCHAR(36),
        delivery_confirmed_at DATETIME,
        farmer_payment_released BOOLEAN DEFAULT false,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id),
        FOREIGN KEY (accepted_by) REFERENCES users(id),
        FOREIGN KEY (delivery_confirmed_by) REFERENCES users(id)
      );
    `);

    // Orders table
    await connection.query(`
      CREATE TABLE orders (
        id VARCHAR(36) PRIMARY KEY,
        retailer_id VARCHAR(36),
        outlet_id VARCHAR(36),
        transporter_id VARCHAR(36),
        status ENUM('pending','dispatched','in_transit','delivered','cancelled') DEFAULT 'pending',
        total_amount DECIMAL(10,2),
        discount_amount DECIMAL(10,2) DEFAULT 0,
        payment_type ENUM('cash','credit') DEFAULT 'credit',
        order_type VARCHAR(20),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (retailer_id) REFERENCES users(id),
        FOREIGN KEY (outlet_id) REFERENCES users(id)
      );
    `);

    // Order Items table
    await connection.query(`
      CREATE TABLE order_items (
        id VARCHAR(36) PRIMARY KEY,
        order_id VARCHAR(36),
        product_id VARCHAR(36),
        quantity DECIMAL(10,2),
        unit_price DECIMAL(10,2),
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
    `);

    // Invoices table
    await connection.query(`
      CREATE TABLE invoices (
        id VARCHAR(36) PRIMARY KEY,
        order_id VARCHAR(36),
        outlet_id VARCHAR(36),
        retailer_id VARCHAR(36),
        amount DECIMAL(10,2),
        status ENUM('unpaid','paid','overdue') DEFAULT 'unpaid',
        payment_type ENUM('cash','credit') DEFAULT 'credit',
        due_date DATETIME,
        paid_at DATETIME,
        overdue_days INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (outlet_id) REFERENCES users(id),
        FOREIGN KEY (retailer_id) REFERENCES users(id)
      );
    `);

    // Journeys table (full schema)
    await connection.query(`
      CREATE TABLE journeys (
        id VARCHAR(36) PRIMARY KEY,
        transporter_id VARCHAR(36),
        assigned_by_role ENUM('admin','outlet') DEFAULT 'admin',
        assigned_by_id VARCHAR(36),
        from_location VARCHAR(100),
        to_location VARCHAR(100),
        origin VARCHAR(100),
        destination VARCHAR(100),
        outlet_id VARCHAR(36),
        order_id VARCHAR(36),
        status ENUM('assigned','departed','in_transit','arrived','breakdown','completed') DEFAULT 'assigned',
        departed_at DATETIME,
        arrived_at DATETIME,
        completed_at DATETIME,
        breakdown_reported BOOLEAN DEFAULT false,
        breakdown_description TEXT,
        breakdown_lat DECIMAL(10,7),
        breakdown_lng DECIMAL(10,7),
        payment_amount DECIMAL(10,2) DEFAULT 5000,
        payment_status ENUM('pending','paid') DEFAULT 'pending',
        payment_released_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transporter_id) REFERENCES users(id),
        FOREIGN KEY (outlet_id) REFERENCES users(id)
      );
    `);

    // GPS Logs table
    await connection.query(`
      CREATE TABLE gps_logs (
        id VARCHAR(36) PRIMARY KEY,
        journey_id VARCHAR(36),
        transporter_id VARCHAR(36),
        latitude DECIMAL(10,7),
        longitude DECIMAL(10,7),
        speed DECIMAL(5,2),
        logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (journey_id) REFERENCES journeys(id),
        FOREIGN KEY (transporter_id) REFERENCES users(id)
      );
    `);

    // Notifications table
    await connection.query(`
      CREATE TABLE notifications (
        id VARCHAR(36) PRIMARY KEY,
        recipient_id VARCHAR(36),
        title VARCHAR(100),
        message TEXT,
        type VARCHAR(30),
        is_read BOOLEAN DEFAULT false,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipient_id) REFERENCES users(id)
      );
    `);

    // Payments table
    await connection.query(`
      CREATE TABLE payments (
        id VARCHAR(36) PRIMARY KEY,
        payer_id VARCHAR(36),
        payee_id VARCHAR(36),
        amount DECIMAL(10,2),
        payment_type VARCHAR(30),
        reference_id VARCHAR(36),
        status ENUM('pending','completed','failed') DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payer_id) REFERENCES users(id),
        FOREIGN KEY (payee_id) REFERENCES users(id)
      );
    `);

    // Transporter Payments table
    await connection.query(`
      CREATE TABLE transporter_payments (
        id VARCHAR(36) PRIMARY KEY,
        journey_id VARCHAR(36),
        transporter_id VARCHAR(36),
        amount DECIMAL(10,2),
        paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        paid_by VARCHAR(36),
        FOREIGN KEY (journey_id) REFERENCES journeys(id),
        FOREIGN KEY (transporter_id) REFERENCES users(id),
        FOREIGN KEY (paid_by) REFERENCES users(id)
      );
    `);

    // Activity Logs table
    await connection.query(`
      CREATE TABLE activity_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        role ENUM('admin','farmer','transporter','outlet','retailer'),
        action_description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // User Language Preferences
    await connection.query(`
      CREATE TABLE user_language_preferences (
        user_id VARCHAR(36) PRIMARY KEY,
        language ENUM('en','si','ta') DEFAULT 'en',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    await connection.query('COMMIT');
    console.log('✅ All tables created successfully');
  } catch (err) {
    await connection.query('ROLLBACK');
    console.error('❌ Error creating tables:', err);
    throw err;
  } finally {
    connection.release();
  }
};

const seedUsers = async () => {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = [
    // Admin
    { name: 'Nestlé Admin', email: 'admin@nestle.lk', role: 'admin', province: 'Western', phone: '0112345678' },
    // Farmers
    { name: 'Farmer — Kandy', email: 'farmer1@nestle.lk', role: 'farmer', province: 'Central', phone: '0771111111' },
    { name: 'Farmer — Kurunegala', email: 'farmer2@nestle.lk', role: 'farmer', province: 'North Western', phone: '0772222222' },
    { name: 'Farmer — Matale', email: 'farmer3@nestle.lk', role: 'farmer', province: 'Central', phone: '0773333333' },
    { name: 'Farmer — Badulla', email: 'farmer4@nestle.lk', role: 'farmer', province: 'Uva', phone: '0774444444' },
    { name: 'Farmer — Ratnapura', email: 'farmer5@nestle.lk', role: 'farmer', province: 'Sabaragamuwa', phone: '0775555555' },
    // Transporters
    { name: 'Transporter W1', email: 'trans1@nestle.lk', role: 'transporter', province: 'Western', phone: '0760000001' },
    { name: 'Transporter W2', email: 'trans2@nestle.lk', role: 'transporter', province: 'Western', phone: '0760000002' },
    { name: 'Transporter C1', email: 'trans3@nestle.lk', role: 'transporter', province: 'Central', phone: '0760000003' },
    { name: 'Transporter C2', email: 'trans4@nestle.lk', role: 'transporter', province: 'Central', phone: '0760000004' },
    { name: 'Transporter S1', email: 'trans5@nestle.lk', role: 'transporter', province: 'Southern', phone: '0760000005' },
    { name: 'Transporter N1', email: 'trans6@nestle.lk', role: 'transporter', province: 'Northern', phone: '0760000006' },
    { name: 'Transporter E1', email: 'trans7@nestle.lk', role: 'transporter', province: 'Eastern', phone: '0760000007' },
    { name: 'Transporter NW1', email: 'trans8@nestle.lk', role: 'transporter', province: 'North Western', phone: '0760000008' },
    { name: 'Transporter SB1', email: 'trans9@nestle.lk', role: 'transporter', province: 'Sabaragamuwa', phone: '0760000009' },
    { name: 'Transporter UV1', email: 'trans10@nestle.lk', role: 'transporter', province: 'Uva', phone: '0760000010' },
    // Outlets
    { name: 'Nestlé Outlet — Western', email: 'outlet.western@nestle.lk', role: 'outlet', province: 'Western', phone: '0112000001' },
    { name: 'Nestlé Outlet — Central', email: 'outlet.central@nestle.lk', role: 'outlet', province: 'Central', phone: '0812000002' },
    { name: 'Nestlé Outlet — Southern', email: 'outlet.southern@nestle.lk', role: 'outlet', province: 'Southern', phone: '0912000003' },
    { name: 'Nestlé Outlet — Northern', email: 'outlet.northern@nestle.lk', role: 'outlet', province: 'Northern', phone: '0212000004' },
    { name: 'Nestlé Outlet — Eastern', email: 'outlet.eastern@nestle.lk', role: 'outlet', province: 'Eastern', phone: '0262000005' },
    // Retailers (assigned to outlets by province)
    { name: 'Retailer — Colombo', email: 'retailer1@nestle.lk', role: 'retailer', province: 'Western', phone: '0113000001' },
    { name: 'Retailer — Kandy', email: 'retailer2@nestle.lk', role: 'retailer', province: 'Central', phone: '0813000002' },
    { name: 'Retailer — Galle', email: 'retailer3@nestle.lk', role: 'retailer', province: 'Southern', phone: '0913000003' },
    { name: 'Retailer — Jaffna', email: 'retailer4@nestle.lk', role: 'retailer', province: 'Northern', phone: '0213000004' },
    { name: 'Retailer — Trinco', email: 'retailer5@nestle.lk', role: 'retailer', province: 'Eastern', phone: '0263000005' },
  ];

  const userIdMap = {};
  for (const user of users) {
    const id = uuidv4();
    userIdMap[user.email] = id;
    await pool.query(
      'INSERT INTO users (id, name, email, password, role, province, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, user.name, user.email, hashedPassword, user.role, user.province, user.phone]
    );
  }

  // Link retailers to their provincial outlets
  const provinceOutletMap = {
    'Western': userIdMap['outlet.western@nestle.lk'],
    'Central': userIdMap['outlet.central@nestle.lk'],
    'Southern': userIdMap['outlet.southern@nestle.lk'],
    'Northern': userIdMap['outlet.northern@nestle.lk'],
    'Eastern': userIdMap['outlet.eastern@nestle.lk'],
  };

  const retailerEmails = ['retailer1@nestle.lk','retailer2@nestle.lk','retailer3@nestle.lk','retailer4@nestle.lk','retailer5@nestle.lk'];
  const retailerProvinces = ['Western','Central','Southern','Northern','Eastern'];
  for (let i = 0; i < retailerEmails.length; i++) {
    const outletId = provinceOutletMap[retailerProvinces[i]];
    await pool.query('UPDATE users SET outlet_id = ? WHERE id = ?', [outletId, userIdMap[retailerEmails[i]]]);
  }

  // Seed transporters metadata
  const transporterData = [
    { email: 'trans1@nestle.lk', vehicle: 'WP CAB-1234', province: 'Western' },
    { email: 'trans2@nestle.lk', vehicle: 'WP CAB-5678', province: 'Western' },
    { email: 'trans3@nestle.lk', vehicle: 'CP CAB-1111', province: 'Central' },
    { email: 'trans4@nestle.lk', vehicle: 'CP CAB-2222', province: 'Central' },
    { email: 'trans5@nestle.lk', vehicle: 'SP CAB-3333', province: 'Southern' },
    { email: 'trans6@nestle.lk', vehicle: 'NP CAB-4444', province: 'Northern' },
    { email: 'trans7@nestle.lk', vehicle: 'EP CAB-5555', province: 'Eastern' },
    { email: 'trans8@nestle.lk', vehicle: 'NWP CAB-6666', province: 'North Western' },
    { email: 'trans9@nestle.lk', vehicle: 'SBP CAB-7777', province: 'Sabaragamuwa' },
    { email: 'trans10@nestle.lk', vehicle: 'UP CAB-8888', province: 'Uva' },
  ];

  for (const t of transporterData) {
    const tid = uuidv4();
    const userId = userIdMap[t.email];
    const name = users.find(u => u.email === t.email).name;
    const phone = users.find(u => u.email === t.email).phone;
    await pool.query(
      'INSERT INTO transporters (id, user_id, name, phone, province, vehicle_number) VALUES (?, ?, ?, ?, ?, ?)',
      [tid, userId, name, phone, t.province, t.vehicle]
    );
  }

  console.log('✅ Users seeded successfully');
  return userIdMap;
};

const seedProducts = async () => {
  const products = [
    { name: 'Nestomalt', category: 'Beverages', unit: 'Pack (400g)', price: 450.00, is_trending: true, province: 'Western' },
    { name: 'Milo', category: 'Beverages', unit: 'Pack (400g)', price: 650.00, is_trending: true, province: 'Central' },
    { name: 'Maggi Noodles', category: 'Food', unit: 'Pack (100g)', price: 120.00, is_trending: false, province: 'Southern' },
    { name: 'Nespray', category: 'Dairy', unit: 'Pack (1kg)', price: 1200.00, is_trending: true, province: 'Western' },
    { name: 'Nescafé Classic', category: 'Beverages', unit: 'Jar (200g)', price: 850.00, is_trending: false, province: 'Northern' },
    { name: 'KitKat', category: 'Confectionery', unit: 'Box (24 pcs)', price: 1800.00, is_trending: true, province: 'Eastern' },
    { name: 'Nestlé Milk', category: 'Dairy', unit: 'Carton (1L)', price: 280.00, is_trending: false, province: 'Central' },
    { name: 'Maggi Sauce', category: 'Food', unit: 'Bottle (500ml)', price: 350.00, is_trending: false, province: 'Southern' },
  ];

  const productIds = {};
  for (const p of products) {
    const id = uuidv4();
    productIds[p.name] = id;
    await pool.query(
      'INSERT INTO products (id, name, category, unit, price_per_unit, is_trending, province) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, p.name, p.category, p.unit, p.price, p.is_trending, p.province]
    );
  }
  console.log('✅ Products seeded successfully');
  return productIds;
};

const seedInventory = async (userIdMap, productIds) => {
  // Seed outlet inventory
  const outletEmails = ['outlet.western@nestle.lk','outlet.central@nestle.lk','outlet.southern@nestle.lk','outlet.northern@nestle.lk','outlet.eastern@nestle.lk'];
  const productList = Object.keys(productIds);

  for (const email of outletEmails) {
    const ownerId = userIdMap[email];
    for (const prodName of productList) {
      const id = uuidv4();
      const qty = Math.floor(Math.random() * 400) + 100; // 100-500
      await pool.query(
        'INSERT INTO inventory (id, owner_id, product_id, quantity, low_stock_threshold) VALUES (?, ?, ?, ?, ?)',
        [id, ownerId, productIds[prodName], qty, 100]
      );
    }
  }

  // Seed retailer inventory
  const retailerEmails = ['retailer1@nestle.lk','retailer2@nestle.lk','retailer3@nestle.lk','retailer4@nestle.lk','retailer5@nestle.lk'];
  for (const email of retailerEmails) {
    const ownerId = userIdMap[email];
    for (const prodName of productList) {
      const id = uuidv4();
      const qty = Math.floor(Math.random() * 80) + 20; // 20-100
      await pool.query(
        'INSERT INTO inventory (id, owner_id, product_id, quantity, low_stock_threshold) VALUES (?, ?, ?, ?, ?)',
        [id, ownerId, productIds[prodName], qty, 40]
      );
    }
  }
  console.log('✅ Inventory seeded successfully');
};

const runSeed = async () => {
  try {
    await createTables();
    const userIdMap = await seedUsers();
    const productIds = await seedProducts();
    await seedInventory(userIdMap, productIds);
    console.log('\n🎉 All seeding completed successfully!\n');
    console.log('Login credentials (password: password123):');
    console.log('  Admin       : admin@nestle.lk');
    console.log('  Farmer 1    : farmer1@nestle.lk');
    console.log('  Transporter : trans1@nestle.lk');
    console.log('  Outlet W    : outlet.western@nestle.lk');
    console.log('  Retailer 1  : retailer1@nestle.lk');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

runSeed();
