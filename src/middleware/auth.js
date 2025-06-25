const jwt = require('jsonwebtoken');
const User = require('../models/user');

// JWT Secret Key - In production, this should be in environment variables
const JWT_SECRET = 'notes-app-secret-key-2024';

const auth = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Find user
        const user = await User.findById(decoded.userId);
        if (!user) {
            throw new Error();
        }

        // Add user and decoded token info to request object
        req.user = {
            ...decoded,  // Include all decoded token information
            _id: user._id,  // Add database user info
            role: user.role
        };
        req.token = token;
        
        next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate' });
    }
};

// Middleware to check if user is admin
const adminAuth = async (req, res, next) => {
    try {
        // First run the regular auth middleware
        await auth(req, res, async () => {
            // Check if user is admin
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
            }
            next();
        });
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate' });
    }
};

// Middleware to check if user is faculty
const facultyAuth = async (req, res, next) => {
    try {
        // First run the regular auth middleware
        await auth(req, res, async () => {
            // Check if user is faculty
            if (req.user.role !== 'faculty') {
                return res.status(403).json({ error: 'Access denied. Faculty privileges required.' });
            }
            next();
        });
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate' });
    }
};

module.exports = { auth, adminAuth, facultyAuth, JWT_SECRET }; 