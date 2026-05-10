const User = require("./User");
const Order = require("./Order");
const OrderItem = require("./OrderItem");
const Product = require("./Product");
const Bid = require("./Bid");
const Alert = require("./Alert");
const Inventory = require("./Inventory");
const AuditLog = require("./AuditLog");
const Message = require("./Message");
const RawMaterialRequest = require("./RawMaterialRequest");
const Payment = require("./Payment");
const Invoice = require("./Invoice");
const UnblockRequest = require("./UnblockRequest");
const DistributorAccount = require("./DistributorAccount");
const DeliveryConfirmation = require("./DeliveryConfirmation");

const defineAssociations = () => {
  User.hasMany(AuditLog, { foreignKey: 'userId' });
  AuditLog.belongsTo(User, { foreignKey: 'userId' });

  User.hasMany(Order, { as: 'Orders', foreignKey: 'recipientId' });
  Order.belongsTo(User, { as: 'Recipient', foreignKey: 'recipientId' });

  User.hasMany(Order, { as: 'Deliveries', foreignKey: 'distributorId' });
  Order.belongsTo(User, { as: 'Distributor', foreignKey: 'distributorId' });

  Order.hasMany(OrderItem, { as: 'items', foreignKey: 'orderId' });
  OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

  Product.hasMany(OrderItem, { foreignKey: 'productId' });
  OrderItem.belongsTo(Product, { as: 'product', foreignKey: 'productId' });

  User.hasMany(Bid, { foreignKey: 'farmerId' });
  Bid.belongsTo(User, { as: 'farmer', foreignKey: 'farmerId' });

  User.hasMany(Alert, { foreignKey: 'recipientId' });
  Alert.belongsTo(User, { foreignKey: 'recipientId' });

  User.hasMany(Inventory, { foreignKey: 'userId' });
  Inventory.belongsTo(User, { foreignKey: 'userId' });

  Product.hasMany(Inventory, { foreignKey: 'productId' });
  Inventory.belongsTo(Product, { as: 'product', foreignKey: 'productId' });

  // New Associations
  User.hasMany(RawMaterialRequest, { foreignKey: 'factoryId' });
  RawMaterialRequest.belongsTo(User, { as: 'factory', foreignKey: 'factoryId' });

  RawMaterialRequest.hasMany(Bid, { foreignKey: 'requestId' });
  Bid.belongsTo(RawMaterialRequest, { as: 'request', foreignKey: 'requestId' });

  Order.hasOne(Payment, { foreignKey: 'orderId' });
  Payment.belongsTo(Order, { foreignKey: 'orderId' });

  Bid.hasOne(Payment, { foreignKey: 'bidId' });
  Payment.belongsTo(Bid, { foreignKey: 'bidId' });

  // New models for Phase 1
  User.hasOne(DistributorAccount, { foreignKey: 'distributorId' });
  DistributorAccount.belongsTo(User, { foreignKey: 'distributorId' });

  User.hasMany(DistributorAccount, { as: 'AssignedDistributors', foreignKey: 'outletId' });
  DistributorAccount.belongsTo(User, { as: 'AssignedOutlet', foreignKey: 'outletId' });

  Order.hasOne(Invoice, { foreignKey: 'orderId' });
  Invoice.belongsTo(Order, { foreignKey: 'orderId' });

  User.hasMany(Invoice, { as: 'DistributorInvoices', foreignKey: 'distributor_id' });
  Invoice.belongsTo(User, { as: 'Distributor', foreignKey: 'distributor_id' });

  User.hasMany(Invoice, { as: 'OutletInvoices', foreignKey: 'outlet_id' });
  Invoice.belongsTo(User, { as: 'Outlet', foreignKey: 'outlet_id' });

  Invoice.hasMany(UnblockRequest, { foreignKey: 'invoice_id' });
  UnblockRequest.belongsTo(Invoice, { foreignKey: 'invoice_id' });

  User.hasMany(UnblockRequest, { foreignKey: 'distributor_id' });
  UnblockRequest.belongsTo(User, { as: 'Distributor', foreignKey: 'distributor_id' });

  User.hasMany(UnblockRequest, { foreignKey: 'reviewed_by' });
  UnblockRequest.belongsTo(User, { as: 'Reviewer', foreignKey: 'reviewed_by' });

  Order.hasOne(DeliveryConfirmation, { foreignKey: 'order_id' });
  DeliveryConfirmation.belongsTo(Order, { foreignKey: 'order_id' });

  User.hasMany(DeliveryConfirmation, { foreignKey: 'confirmed_by' });
  DeliveryConfirmation.belongsTo(User, { as: 'Confirmer', foreignKey: 'confirmed_by' });

  User.hasMany(Order, { as: 'SuppliedOrders', foreignKey: 'supplierId' });
  Order.belongsTo(User, { as: 'Supplier', foreignKey: 'supplierId' });
};

module.exports = defineAssociations;
