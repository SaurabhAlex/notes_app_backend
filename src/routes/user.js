const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { auth } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserDetails:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - mobileNumber
 *       properties:
 *         firstName:
 *           type: string
 *           description: User's first name
 *         lastName:
 *           type: string
 *           description: User's last name
 *         mobileNumber:
 *           type: string
 *           description: User's mobile number (must be unique)
 */

/**
 * @swagger
 * /api/user/add-details:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Add user details
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserDetails'
 *     responses:
 *       200:
 *         description: User details added successfully
 *       400:
 *         description: Validation error or mobile number already exists
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/add-details', auth, async (req, res) => {
    try {
        const { firstName, lastName, mobileNumber } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !mobileNumber) {
            return res.status(400).json({ 
                error: 'All fields (firstName, lastName, mobileNumber) are required' 
            });
        }

        // Check if mobile number already exists
        const existingUser = await User.findOne({ mobileNumber });
        if (existingUser) {
            return res.status(400).json({ error: 'Mobile number already registered' });
        }

        // Update user details
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { firstName, lastName, mobileNumber },
            { new: true, runValidators: true }
        );

        res.json({
            message: 'User details added successfully',
            user: {
                firstName: user.firstName,
                lastName: user.lastName,
                mobileNumber: user.mobileNumber,
                email: user.email
            }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @swagger
 * /api/user/edit-details:
 *   put:
 *     security:
 *       - bearerAuth: []
 *     summary: Edit user details
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserDetails'
 *     responses:
 *       200:
 *         description: User details updated successfully
 *       400:
 *         description: Validation error or mobile number already exists
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/edit-details', auth, async (req, res) => {
    try {
        const { firstName, lastName, mobileNumber } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !mobileNumber) {
            return res.status(400).json({ 
                error: 'All fields (firstName, lastName, mobileNumber) are required' 
            });
        }

        // If mobile number is being updated, check if it already exists
        if (mobileNumber && mobileNumber !== req.user.mobileNumber) {
            const existingUser = await User.findOne({ mobileNumber });
            if (existingUser) {
                return res.status(400).json({ error: 'Mobile number already registered' });
            }
        }

        // Update user details
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { firstName, lastName, mobileNumber },
            { new: true, runValidators: true }
        );

        res.json({
            message: 'User details updated successfully',
            user: {
                firstName: user.firstName,
                lastName: user.lastName,
                mobileNumber: user.mobileNumber,
                email: user.email
            }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @swagger
 * /api/user/delete:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: Delete user account
 *     tags: [User]
 *     responses:
 *       200:
 *         description: User account deleted successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/delete', auth, async (req, res) => {
    try {
        // Delete the user
        await User.findByIdAndDelete(req.user._id);
        
        res.json({
            message: 'User account deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user account' });
    }
});

module.exports = router; 