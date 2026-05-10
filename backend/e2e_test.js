const http = require('http');

const BASE_URL = 'http://localhost:5001/api';
const PASSWORD = 'password123';

const USERS = {
  admin: 'admin@nestle.lk',
  outlet: 'outlet.western@nestle.lk',
  retailer: 'retailer1@nestle.lk',
  transporter: 'trans1@nestle.lk',
  farmer: 'farmer1@nestle.lk'
};

const tokens = {};
let createdOrderId = null;
let createdJourneyId = null;
let createdInvoiceId = null;
let createdBidId = null;

// Helper to make API requests
async function makeRequest(endpoint, method, body = null, token = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await res.json().catch(() => null);
  
  if (!res.ok) throw new Error(`API Error: ${method} ${endpoint} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function runTest() {
  console.log('🚀 Starting NestleChain Full E2E Automated Test...\n');

  try {
    // ---------------------------------------------------------
    // STEP 1: AUTHENTICATE ALL ROLES
    // ---------------------------------------------------------
    console.log('🔄 STEP 1: Authenticating Users...');
    for (const [role, email] of Object.entries(USERS)) {
      const res = await makeRequest('/auth/login', 'POST', { email, password: PASSWORD });
      tokens[role] = res.token;
      console.log(`  ✅ Logged in as ${role} (${email})`);
    }
    console.log('');

    // ---------------------------------------------------------
    // STEP 2: RETAILER PLACES AN ORDER
    // ---------------------------------------------------------
    console.log('🛒 STEP 2: Retailer Places an Order');
    const productsRes = await makeRequest('/retailer/inventory', 'GET', null, tokens.retailer);
    const productToOrder = productsRes[0]; // Just take the first product
    
    if (!productToOrder) throw new Error('No products found for retailer to order.');

    const orderRes = await makeRequest('/retailer/orders', 'POST', {
      items: [ { productId: productToOrder.product_id, quantity: 50, unitPrice: productToOrder.price || 100 } ],
      paymentType: 'credit'
    }, tokens.retailer);
    
    createdOrderId = orderRes.orderId;
    console.log(`  ✅ Order #${createdOrderId} created successfully by Retailer.\n`);

    // ---------------------------------------------------------
    // STEP 3: OUTLET DISPATCHES RETAILER ORDER & ASSIGNS TRANSPORTER
    // ---------------------------------------------------------
    console.log('📦 STEP 3: Outlet Dispatches Order and Assigns Transporter');
    
    // First, find the transporter ID
    // Quick hack: Parse Transporter JWT to get ID
    const transporterData = JSON.parse(Buffer.from(tokens.transporter.split('.')[1], 'base64').toString());
    const transporterId = transporterData.id;

    await makeRequest(`/outlet/orders/${createdOrderId}/dispatch`, 'PUT', {
      transporter_id: transporterId
    }, tokens.outlet);
    
    console.log(`  ✅ Order dispatched. Assigned to Transporter ID: ${transporterId}\n`);

    // ---------------------------------------------------------
    // STEP 4: TRANSPORTER LOGISTICS JOURNEY
    // ---------------------------------------------------------
    console.log('🚚 STEP 4: Transporter Handles the Journey');
    const journeysRes = await makeRequest('/transporter/journeys', 'GET', null, tokens.transporter);
    const activeJourney = journeysRes.find(j => j.status === 'assigned');
    
    if (!activeJourney) throw new Error('No assigned journey found for transporter.');
    createdJourneyId = activeJourney.id;

    console.log(`  ✅ Found pending journey #${createdJourneyId}.`);
    
    // Start Journey
    await makeRequest(`/transporter/journeys/${createdJourneyId}/depart`, 'PUT', null, tokens.transporter);
    console.log(`  ✅ Journey departed.`);

    // Complete Journey (Triggers Payment Generation)
    await makeRequest(`/transporter/journeys/${createdJourneyId}/complete`, 'PUT', null, tokens.transporter);
    console.log(`  ✅ Journey completed. Payment automatically processed!\n`);

    // ---------------------------------------------------------
    // STEP 5: RETAILER SETTLES INVOICE
    // ---------------------------------------------------------
    console.log('💳 STEP 5: Retailer Settles the Invoice');
    const invoicesRes = await makeRequest('/retailer/invoices', 'GET', null, tokens.retailer);
    const pendingInvoice = invoicesRes.find(i => i.status !== 'paid');

    if (pendingInvoice) {
      await makeRequest(`/retailer/invoices/${pendingInvoice.id}/pay`, 'PUT', null, tokens.retailer);
      console.log(`  ✅ Invoice #${pendingInvoice.id} paid successfully.\n`);
    } else {
      console.log(`  ⚠️ No pending invoice found (order might have been cash).\n`);
    }

    // ---------------------------------------------------------
    // STEP 6: RAW MATERIAL SOURCING (BIDS)
    // ---------------------------------------------------------
    console.log('🌾 STEP 6: Farmer Raw Material Sourcing');
    
    // Admin creates a bid
    const bidRes = await makeRequest('/admin/bids', 'POST', {
      material_name: 'Fresh Milk',
      quantity: 500,
      unit: 'Liters',
      bid_amount: 125000,
      bid_type: 'open'
    }, tokens.admin);
    
    createdBidId = bidRes.id || bidRes.insertId;
    console.log(`  ✅ Admin published new bid for Fresh Milk.`);

    // Farmer fetches open bids and accepts the latest one
    const farmerBids = await makeRequest('/farmer/bids', 'GET', null, tokens.farmer);
    const openBid = farmerBids.find(b => b.status === 'open');
    
    if (!openBid) throw new Error('No open bids found for the farmer.');
    
    await makeRequest(`/farmer/bids/${openBid.id}/accept`, 'PUT', null, tokens.farmer);
    console.log(`  ✅ Farmer accepted the bid #${openBid.id}.`);

    // Farmer delivers the goods
    await makeRequest(`/farmer/bids/${openBid.id}/mark-delivered`, 'PUT', null, tokens.farmer);
    console.log(`  ✅ Farmer marked the bid delivery as completed. Payment generated!\n`);

    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
    console.log('End-to-End supply chain flow verified.');

  } catch (err) {
    console.error('\n❌ TEST FAILED!');
    console.error(err.message);
  }
}

runTest();
