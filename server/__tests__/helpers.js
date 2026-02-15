const request = require('supertest');
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const User = require('../src/models/user.model');
const Task = require('../src/models/task.model');
const Offer = require('../src/models/offer.model');
const { signAuthToken } = require('../src/utils/jwt');

/**
 * Helper to connect to test database
 */
async function connectTestDb() {
  if (mongoose.connection.readyState === 1) {
    // Already connected
    return;
  }
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmarket-test';
  await mongoose.connect(mongoUri);
}

/**
 * Helper to disconnect test database
 */
async function disconnectTestDb() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
}

/**
 * Helper to clear all collections
 */
async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
}

/**
 * Helper to create a user and get auth token
 */
async function createUserWithToken(userData = {}) {
  const password = userData.password || 'password123';
  const passwordHash = await bcryptjs.hash(password, 10);

  const user = await User.create({
    email: userData.email || `user${Date.now()}@test.com`,
    fullName: userData.name || userData.fullName || 'Test User',
    passwordHash,
    role: userData.role || 'user',
  });

  const token = signAuthToken(user);

  return { user, token };
}

/**
 * Helper to create a task
 */
async function createTask(requesterId, taskData = {}) {
  const task = await Task.create({
    requesterId,
    title: taskData.title || 'Test Task',
    description: taskData.description || 'This is a test task description',
    budgetAmount: taskData.budgetAmount || 100,
    currency: taskData.currency || 'INR',
  });

  return task;
}

/**
 * Helper to create an offer
 */
async function createOffer(taskId, fulfillerId, offerData = {}) {
  const offer = await Offer.create({
    taskId,
    fulfillerId,
    amount: offerData.amount || 50,
    message: offerData.message || 'I can do this',
  });

  return offer;
}

module.exports = {
  connectTestDb,
  disconnectTestDb,
  clearDatabase,
  createUserWithToken,
  createTask,
  createOffer,
};
