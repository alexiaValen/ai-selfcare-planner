const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        message: 'No token provided, authorization denied' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Token is not valid, user not found' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        message: 'Account is deactivated' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired' 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error during authentication' 
    });
  }
};

// Middleware to check if user is admin
const adminAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required' 
      });
    }

    // Check if user has admin role (you can add admin field to User model)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Admin access required' 
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ 
      message: 'Server error during admin authentication' 
    });
  }
};

// Middleware to check if user owns the resource
const resourceOwner = (resourceField = 'userId') => {
  return (req, res, next) => {
    try {
      const resourceUserId = req.body[resourceField] || req.params[resourceField];
      
      if (!resourceUserId) {
        return res.status(400).json({ 
          message: 'Resource owner information missing' 
        });
      }

      if (req.user._id.toString() !== resourceUserId.toString()) {
        return res.status(403).json({ 
          message: 'Access denied: You can only access your own resources' 
        });
      }

      next();
    } catch (error) {
      console.error('Resource owner middleware error:', error);
      res.status(500).json({ 
        message: 'Server error during resource ownership check' 
      });
    }
  };
};

// Middleware to validate request body
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    next();
  };
};

// Middleware to update user's last activity
const updateLastActivity = async (req, res, next) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        lastLogin: new Date()
      });
    }
    next();
  } catch (error) {
    console.error('Update last activity error:', error);
    // Don't block the request if this fails
    next();
  }
};

module.exports = {
  auth,
  adminAuth,
  resourceOwner,
  validateRequest,
  updateLastActivity
};