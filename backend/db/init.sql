-- Users table (all roles)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','farmer','transporter','outlet','retailer')),
  province VARCHAR(50),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  is_blocked BOOLEAN DEFAULT false,
  blocked_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  unit VARCHAR(20),
  price_per_unit DECIMAL(10,2),
  is_trending BOOLEAN DEFAULT false,
  province VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inventory table (per outlet and retailer)
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) DEFAULT 0,
  low_stock_threshold DECIMAL(10,2) DEFAULT 25,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Raw material bids (Admin → Farmers)
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id),
  material_name VARCHAR(100) NOT NULL,
  quantity DECIMAL(10,2),
  unit VARCHAR(20),
  bid_amount DECIMAL(10,2),
  bid_type VARCHAR(20) CHECK (bid_type IN ('bid','direct_order')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','accepted','rejected','delivered','paid')),
  accepted_by UUID REFERENCES users(id),
  delivery_confirmed_by UUID REFERENCES users(id),
  delivery_confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders (Retailer → Outlet)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID REFERENCES users(id),
  outlet_id UUID REFERENCES users(id),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','processing','dispatched','delivered','cancelled')),
  total_amount DECIMAL(10,2),
  order_type VARCHAR(20) CHECK (order_type IN ('manual','auto_alert')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2),
  unit_price DECIMAL(10,2)
);

-- Invoices (Outlet → Retailer)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  outlet_id UUID REFERENCES users(id),
  retailer_id UUID REFERENCES users(id),
  amount DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid','overdue')),
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  overdue_days INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transporter journeys
CREATE TABLE IF NOT EXISTS journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transporter_id UUID REFERENCES users(id),
  origin VARCHAR(100),
  destination VARCHAR(100),
  outlet_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned','departed','in_transit','breakdown','arrived','completed')),
  departure_time TIMESTAMP,
  arrival_time TIMESTAMP,
  end_time TIMESTAMP,
  payment_amount DECIMAL(10,2),
  payment_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- GPS tracking (live locations)
CREATE TABLE IF NOT EXISTS gps_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  transporter_id UUID REFERENCES users(id),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  speed DECIMAL(5,2),
  logged_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100),
  message TEXT,
  type VARCHAR(30),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID REFERENCES users(id),
  payee_id UUID REFERENCES users(id),
  amount DECIMAL(10,2),
  payment_type VARCHAR(30) CHECK (payment_type IN ('farmer_delivery','transporter_journey','retailer_invoice')),
  reference_id UUID,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  created_at TIMESTAMP DEFAULT NOW()
);
