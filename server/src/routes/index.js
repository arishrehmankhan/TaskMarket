const express = require('express');
const authRoutes = require('./auth.routes');
const chatRoutes = require('./chat.routes');
const reportsRoutes = require('./reports.routes');
const reviewsRoutes = require('./reviews.routes');
const systemRoutes = require('./system.routes');
const taskRoutes = require('./tasks.routes');
const usersRoutes = require('./users.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/reports', reportsRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/tasks', taskRoutes);
router.use('/users', usersRoutes);
router.use('/', systemRoutes);

module.exports = router;
