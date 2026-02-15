const bcrypt = require('bcryptjs');
const User = require('../models/user.model');

async function ensureAdminUser({ adminEmail, adminPassword, adminFullName }) {
  const existingAdmin = await User.findOne({ role: 'admin' }).lean();
  if (existingAdmin) {
    return {
      created: false,
      id: String(existingAdmin._id),
      email: existingAdmin.email,
    };
  }

  const email = String(adminEmail).trim().toLowerCase();
  const existingByEmail = await User.findOne({ email }).lean();
  if (existingByEmail && existingByEmail.role !== 'admin') {
    throw new Error(`Cannot create admin account because ${email} is already used by a non-admin user`);
  }

  if (existingByEmail && existingByEmail.role === 'admin') {
    return {
      created: false,
      id: String(existingByEmail._id),
      email: existingByEmail.email,
    };
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const created = await User.create({
    fullName: adminFullName,
    email,
    passwordHash,
    role: 'admin',
  });

  return {
    created: true,
    id: String(created._id),
    email: created.email,
  };
}

module.exports = ensureAdminUser;