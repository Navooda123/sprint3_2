const { sequelize, connectDB } = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');
const Inventory = require('./models/Inventory');
const defineAssociations = require('./models/associations');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    await connectDB();
    defineAssociations();
    await sequelize.sync({ alter: true });
    
    const salt = await bcrypt.genSalt(10);
    const hashedPwd = await bcrypt.hash('password123', salt);

    console.log('Seeding data...');

    // Create Admin (Factory in Kurunegala)
    await User.upsert({
      email: 'admin@nestle.com',
      name: 'Nestle Factory Admin',
      password: hashedPwd,
      role: 'Admin',
      province: 'North Western',
      district: 'Kurunegala',
      address: 'Nestlé Lanka Factory, Kurunegala, Sri Lanka'
    });

    // Create Farmer
    await User.upsert({
      email: 'farmer@nestle.com',
      name: 'Amal Perera',
      password: hashedPwd,
      role: 'Farmer',
      province: 'Central',
      district: 'Matale',
      farmType: 'Dairy Farm',
      nic: '851234567V',
      bankName: 'Bank of Ceylon',
      bankAccount: '1234567890',
      accountHolder: 'Amal Perera',
      phone: '+94 77 123 4567'
    });

    // Create Retailer
    await User.upsert({
      email: 'retailer@nestle.com',
      name: 'Nugegoda Supermart',
      password: hashedPwd,
      role: 'Retailer',
      province: 'Western',
      district: 'Colombo',
      address: 'High Level Rd, Nugegoda',
      nic: '901234567V',
      bankName: 'Commercial Bank',
      bankAccount: '0987654321',
      accountHolder: 'Nimal Silva',
      phone: '+94 71 987 6543'
    });

    // Create Distributor
    await User.upsert({
      email: 'distributor@nestle.com',
      name: 'Lanka Logistics Ltd',
      password: hashedPwd,
      role: 'Distributor',
      province: 'Western',
      district: 'Colombo',
      vehicleRegistration: 'WP-CAB-1234',
      phone: '+94 75 555 1234'
    });
    
    // Create Outlet
    await User.upsert({
      email: 'outlet@nestle.com',
      name: 'Nestlé Hub Gampaha',
      password: hashedPwd,
      role: 'Outlet',
      province: 'Western',
      district: 'Gampaha',
      address: 'Main St, Gampaha',
      phone: '+94 72 444 8888'
    });

    // Create Products (Nestlé Sri Lanka Catalog)
    const products = [
      { sku: 'MLO-400-TIN', name: 'MILO Active Go 400g tin', price: 850.00, category: 'Beverage', stockThreshold: 25 },
      { sku: 'MLO-1KG-TIN', name: 'MILO Active Go 1kg tin', price: 1950.00, category: 'Beverage', stockThreshold: 25 },
      { sku: 'MLO-2KG-TIN', name: 'MILO 2kg tin', price: 3800.00, category: 'Beverage', stockThreshold: 25 },
      { sku: 'MLO-3IN1-BOX', name: 'MILO 3in1 Sachet Box (30 sachets)', price: 720.00, category: 'Beverage', stockThreshold: 25 },
      { sku: 'NST-400', name: 'NESTOMALT 400g', price: 680.00, category: 'Beverage', stockThreshold: 25 },
      { sku: 'NST-1KG', name: 'NESTOMALT 1kg', price: 1550.00, category: 'Beverage', stockThreshold: 25 },
      { sku: 'NSC-CLS-200', name: 'NESCAFÉ Classic 200g', price: 1200.00, category: 'Beverage', stockThreshold: 25 },
      { sku: 'NSC-GLD-100', name: 'NESCAFÉ Gold 100g', price: 1800.00, category: 'Beverage', stockThreshold: 25 },
      { sku: 'NSC-3IN1-BOX', name: 'NESCAFÉ 3in1 Sachet Box (25 sachets)', price: 550.00, category: 'Beverage', stockThreshold: 25 },
      
      { sku: 'MAG-CHK-5PK', name: 'MAGGI Noodles Chicken Flavor (pack of 5)', price: 195.00, category: 'Food', stockThreshold: 25 },
      { sku: 'MAG-MSL-5PK', name: 'MAGGI Noodles Masala Flavor (pack of 5)', price: 195.00, category: 'Food', stockThreshold: 25 },
      { sku: 'MAG-CMP-300', name: 'MAGGI Coconut Milk Powder 300g', price: 420.00, category: 'Food', stockThreshold: 25 },
      { sku: 'MAG-CMP-1KG', name: 'MAGGI Coconut Milk Powder 1kg', price: 1250.00, category: 'Food', stockThreshold: 25 },

      { sku: 'NSP-MLK-400', name: 'NESTLÉ Nespray Milk Powder 400g', price: 980.00, category: 'Dairy', stockThreshold: 25 },
      { sku: 'NSP-MLK-1KG', name: 'NESTLÉ Nespray Milk Powder 1kg', price: 2200.00, category: 'Dairy', stockThreshold: 25 },
      { sku: 'ANC-MLK-400', name: 'NESTLÉ Anchor Milk Powder 400g', price: 920.00, category: 'Dairy', stockThreshold: 25 },

      { sku: 'KIT-2F-SGL', name: 'KIT KAT 2-finger (single)', price: 90.00, category: 'Confectionery', stockThreshold: 25 },
      { sku: 'KIT-4F-SGL', name: 'KIT KAT 4-finger (single)', price: 160.00, category: 'Confectionery', stockThreshold: 25 },
      { sku: 'KIT-MUL-12', name: 'KIT KAT Multipack (12 bars)', price: 1050.00, category: 'Confectionery', stockThreshold: 25 },
      { sku: 'LION-DAT-SGL', name: 'LION Date Roll (single)', price: 75.00, category: 'Confectionery', stockThreshold: 25 },
      { sku: 'LION-DAT-BOX', name: 'LION Date Roll Box (24 units)', price: 1650.00, category: 'Confectionery', stockThreshold: 25 },

      { sku: 'NSQ-CER-300', name: 'NESTLÉ Nesquik Cereal 300g', price: 850.00, category: 'Cereals', stockThreshold: 25 },
      { sku: 'FIT-CER-375', name: 'NESTLÉ Fitness Cereal 375g', price: 920.00, category: 'Cereals', stockThreshold: 25 },
      { sku: 'NPL-WAT-500', name: 'NESTLÉ Pure Life Water 500ml', price: 60.00, category: 'Water', stockThreshold: 25 },
      { sku: 'NPL-WAT-1.5L', name: 'NESTLÉ Pure Life Water 1.5L', price: 110.00, category: 'Water', stockThreshold: 25 }
    ];

    for (const p of products) {
      await Product.findOrCreate({
        where: { sku: p.sku },
        defaults: p
      });
    }

    // Seed Inventory for Retailer and Outlet
    const retailer = await User.findOne({ where: { email: 'retailer@nestle.com' } });
    if (retailer) {
      const dbProducts = await Product.findAll();
      for (const p of dbProducts) {
        await Inventory.findOrCreate({
          where: { userId: retailer.id, productId: p.id },
          defaults: { quantity: 15 } // Set low stock to trigger alerts
        });
      }
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seed();
