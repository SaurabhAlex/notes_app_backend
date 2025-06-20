const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Faculty = require('../models/faculty');
const { JWT_SECRET, auth } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           format: password
 *           description: User's password
 *     UserResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         token:
 *           type: string
 *         userId:
 *           type: string
 *     FacultyResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         token:
 *           type: string
 *         faculty:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             facultyId:
 *               type: string
 *             employeeId:
 *               type: string
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             email:
 *               type: string
 *             department:
 *               type: string
 *             role:
 *               type: object
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: User and faculty authentication endpoints
 */

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Email already exists
 */
router.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create new user
        const user = new User({
            email,
            password // The password will be hashed by the pre-save middleware
        });

        await user.save();
        
        // Generate token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
        
        res.status(201).json({
            message: 'User created successfully',
            token,
            userId: user._id
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to create user account' });
    }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login regular user (non-faculty)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({
            message: 'Login successful',
            token,
            userId: user._id
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

/**
 * @swagger
 * /auth/faculty/login:
 *   post:
 *     summary: Login faculty member
 *     description: |
 *       Login endpoint specifically for faculty members.
 *       This endpoint:
 *       1. Validates faculty credentials
 *       2. Checks if faculty profile exists and is active
 *       3. Returns faculty-specific information and JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: "faculty@example.com"
 *             password: "Admin@123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FacultyResponse'
 *       401:
 *         description: Invalid credentials or inactive faculty account
 *       404:
 *         description: No faculty profile found for this account
 */
router.post('/faculty/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user and faculty
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Find associated faculty
        const faculty = await Faculty.findOne({ email }).populate('role', 'name description');
        if (!faculty) {
            return res.status(401).json({ error: 'No faculty profile found for this account' });
        }

        if (!faculty.isActive) {
            return res.status(401).json({ error: 'Faculty account is inactive' });
        }

        // Generate token with faculty info
        const token = jwt.sign({ 
            userId: user._id,
            facultyId: faculty._id,
            role: faculty.role.name
        }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({
            message: 'Login successful',
            token,
            faculty: {
                id: faculty._id,
                facultyId: faculty.facultyId,
                employeeId: faculty.employeeId,
                firstName: faculty.firstName,
                lastName: faculty.lastName,
                email: faculty.email,
                department: faculty.department,
                role: faculty.role
            }
        });
    } catch (error) {
        console.error('Faculty login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Change user password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Invalid current password
 */
router.post('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        // Validate new password
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }

        // Find user
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

module.exports = router; 