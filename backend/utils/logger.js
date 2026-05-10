const AuditLog = require('../models/AuditLog');

const logActivity = async (action, user, details = '') => {
  try {
    await AuditLog.create({
      action,
      userId: user?.id,
      userName: user?.name,
      role: user?.role,
      details
    });
  } catch (error) {
    console.error('Audit Log Error:', error);
  }
};

module.exports = { logActivity };
