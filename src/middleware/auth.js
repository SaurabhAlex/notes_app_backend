const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-secret-key'; // In production, use environment variables

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            throw new Error();
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate.' });
    }
};

module.exports = { auth, JWT_SECRET }; 