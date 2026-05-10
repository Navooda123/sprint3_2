require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');
const startOverdueCron = require('./cron/overdueCheck');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Pass Socket.IO instance to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket.IO Connection Logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', ({ userId }) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their private room`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const farmerRoutes = require('./routes/farmer');
const transporterRoutes = require('./routes/transporter');
const outletRoutes = require('./routes/outlet');
const retailerRoutes = require('./routes/retailer');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/farmer', farmerRoutes);
app.use('/api/transporter', transporterRoutes);
app.use('/api/outlet', outletRoutes);
app.use('/api/retailer', retailerRoutes);

// Root Endpoint
app.get('/', (req, res) => {
  res.send('NestléChain Backend API is Running...');
});

// Start Cron Job
startOverdueCron(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
