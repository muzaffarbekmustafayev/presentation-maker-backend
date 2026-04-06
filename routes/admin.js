const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Presentation = require('../models/Presentation');
const Document = require('../models/Document');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const authMiddleware = (req, res, next) => {
  const jwt = require('jsonwebtoken');
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

const adminMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ msg: 'Access denied: Admin only' });
    }
    next();
  } catch (err) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

// Apply middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// @route   GET api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    let presentationsCount = 0;
    try {
      if (mongoose.models.Presentation) {
        presentationsCount = await mongoose.models.Presentation.countDocuments();
      } else {
        presentationsCount = await mongoose.connection.collection('presentations').countDocuments() || 0;
      }
    } catch(e) { }

    let documentsCount = 0;
    try {
      if (mongoose.models.Document) {
        documentsCount = await mongoose.models.Document.countDocuments();
      } else {
        documentsCount = await mongoose.connection.collection('documents').countDocuments() || 0;
      }
    } catch(e) { }

    // Mock data for charts - users registered by day for last 7 days
    const chartData = [
      { name: 'Mon', users: Math.floor(usersCount * 0.1), presentations: Math.floor(presentationsCount * 0.1), documents: Math.floor(documentsCount * 0.1) },
      { name: 'Tue', users: Math.floor(usersCount * 0.15), presentations: Math.floor(presentationsCount * 0.2), documents: Math.floor(documentsCount * 0.2) },
      { name: 'Wed', users: Math.floor(usersCount * 0.2), presentations: Math.floor(presentationsCount * 0.15), documents: Math.floor(documentsCount * 0.1) },
      { name: 'Thu', users: Math.floor(usersCount * 0.1), presentations: Math.floor(presentationsCount * 0.1), documents: Math.floor(documentsCount * 0.15) },
      { name: 'Fri', users: Math.floor(usersCount * 0.25), presentations: Math.floor(presentationsCount * 0.3), documents: Math.floor(documentsCount * 0.3) },
      { name: 'Sat', users: Math.floor(usersCount * 0.15), presentations: Math.floor(presentationsCount * 0.1), documents: Math.floor(documentsCount * 0.1) },
      { name: 'Sun', users: Math.floor(usersCount * 0.05), presentations: Math.floor(presentationsCount * 0.05), documents: Math.floor(documentsCount * 0.05) },
    ];

    res.json({
      users: usersCount,
      presentations: presentationsCount,
      documents: documentsCount,
      chartData
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @route   GET api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password -__v').lean().sort({ createdAt: -1 });
    
    const presentationCounts = await Presentation.aggregate([
      { $group: { _id: "$userId", count: { $sum: 1 } } }
    ]);
    const documentCounts = await Document.aggregate([
      { $group: { _id: "$userId", count: { $sum: 1 } } }
    ]);
    const countMap = {};
    const docCountMap = {};
    presentationCounts.forEach(p => countMap[p._id.toString()] = p.count);
    documentCounts.forEach(d => docCountMap[d._id.toString()] = d.count);

    const updatedUsers = users.map(u => ({
      ...u,
      presentationCount: countMap[u._id?.toString()] || 0,
      documentCount: docCountMap[u._id?.toString()] || 0
    }));

    res.json(updatedUsers);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @route   POST api/admin/users
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    user = new User({ name, email, role: role || 'User', password });
    if(password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    await user.save();
    
    // Don't send password hash back
    const userResponse = user.toObject();
    delete userResponse.password;
    res.json(userResponse);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @route   PUT api/admin/users/:id
router.put('/users/:id', async (req, res) => {
  try {
    const { name, email, role, newPassword } = req.body;
    let user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;

    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }
    
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;
    res.json(userResponse);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    
    // Basic protection against deleting oneself
    if (user.id === req.user.id) {
       return res.status(400).json({ msg: 'Cannot delete your own admin account' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ msg: 'User removed' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
