const express = require('express');
const router = express.Router();
const Faculty = require('../models/faculty');
const Role = require('../models/role');
const User = require('../models/user');
const { auth } = require('../middleware/auth');
const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Faculty:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - mobileNumber
 *         - gender
 *         - department
 *         - role
 *       properties:
 *         facultyId:
 *           type: string
 *           description: Unique faculty ID (auto-generated)
 *         employeeId:
 *           type: string
 *           description: Unique employee ID (auto-generated)
 *         firstName:
 *           type: string
 *           description: Faculty's first name
 *         lastName:
 *           type: string
 *           description: Faculty's last name
 *         email:
 *           type: string
 *           format: email
 *           description: Faculty's email address
 *         mobileNumber:
 *           type: string
 *           description: Faculty's mobile number (must be unique)
 *         gender:
 *           type: string
 *           enum: [Male, Female, Other]
 *           description: Faculty's gender
 *         department:
 *           type: string
 *           description: Faculty's department
 *         role:
 *           type: string
 *           enum: [Professor, Associate Professor, Assistant Professor, HOD, Dean]
 *           description: Faculty's role in the institution
 *     FacultyInput:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - mobileNumber
 *         - gender
 *         - department
 *         - role
 *       properties:
 *         firstName:
 *           type: string
 *           description: Faculty's first name
 *         lastName:
 *           type: string
 *           description: Faculty's last name
 *         email:
 *           type: string
 *           format: email
 *           description: Faculty's email address
 *         mobileNumber:
 *           type: string
 *           description: Faculty's mobile number (must be unique)
 *         gender:
 *           type: string
 *           enum: [Male, Female, Other]
 *           description: Faculty's gender
 *         department:
 *           type: string
 *           description: Faculty's department
 *         role:
 *           type: string
 *           enum: [Professor, Associate Professor, Assistant Professor, HOD, Dean]
 *           description: Faculty's role in the institution
 *     FacultyResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/FacultyInput'
 *         - type: object
 *           properties:
 *             facultyId:
 *               type: string
 *               description: Unique faculty ID (auto-generated)
 *             employeeId:
 *               type: string
 *               description: Unique employee ID (auto-generated)
 */

/**
 * @swagger
 * /api/faculty/add:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Add a new faculty profile
 *     tags: [Faculty]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FacultyInput'
 *     responses:
 *       200:
 *         description: Faculty profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 faculty:
 *                   $ref: '#/components/schemas/FacultyResponse'
 *       400:
 *         description: Validation error or duplicate entry
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/add', auth, async (req, res) => {
    try {
        const { firstName, lastName, email, mobileNumber, gender, department, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                error: 'A user with this email already exists' 
            });
        }

        // Validate role exists and is active
        const validRole = await Role.findOne({ _id: role, isActive: true });
        if (!validRole) {
            return res.status(400).json({ error: 'Invalid or inactive role selected' });
        }

        // Start a session for transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Create faculty
            const faculty = new Faculty({
                firstName,
                lastName,
                email,
                mobileNumber,
                gender,
                department,
                role
            });

            await faculty.save({ session });

            // Create user account with default password
            const user = new User({
                email: email.toLowerCase(),
                password: 'Admin@123',
                firstName,
                lastName,
                mobileNumber
            });

            await user.save({ session });

            // Commit the transaction
            await session.commitTransaction();

            // Populate role details in response
            await faculty.populate('role', 'name description');

            res.status(201).json({
                message: 'Faculty added successfully with login credentials',
                faculty: {
                    id: faculty._id,
                    facultyId: faculty.facultyId,
                    employeeId: faculty.employeeId,
                    firstName: faculty.firstName,
                    lastName: faculty.lastName,
                    email: faculty.email,
                    mobileNumber: faculty.mobileNumber,
                    gender: faculty.gender,
                    department: faculty.department,
                    role: faculty.role
                },
                loginCredentials: {
                    username: email.toLowerCase(),
                    password: 'Admin@123'
                }
            });
        } catch (error) {
            // If anything fails, abort the transaction
            await session.abortTransaction();
            throw error;
        } finally {
            // End the session
            session.endSession();
        }
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ 
                error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
            });
        }
        console.error('Error adding faculty:', error);
        res.status(500).json({ error: 'Failed to add faculty' });
    }
});

/**
 * @swagger
 * /api/faculty/list:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get all active faculty profiles
 *     tags: [Faculty]
 *     responses:
 *       200:
 *         description: List of faculty profiles
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/list', auth, async (req, res) => {
    try {
        const faculty = await Faculty.find({ isActive: true })
            .populate('role', 'name description')
            .sort({ firstName: 1 });

        res.json({ faculty });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch faculty list' });
    }
});

/**
 * @swagger
 * /api/faculty/edit/{id}:
 *   put:
 *     security:
 *       - bearerAuth: []
 *     summary: Edit a specific faculty profile
 *     tags: [Faculty]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Faculty ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FacultyInput'
 *     responses:
 *       200:
 *         description: Faculty profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 faculty:
 *                   $ref: '#/components/schemas/FacultyResponse'
 *       400:
 *         description: Validation error or duplicate entry
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Faculty profile not found
 *       500:
 *         description: Server error
 */
router.put('/edit/:id', auth, async (req, res) => {
    try {
        const { firstName, lastName, email, mobileNumber, gender, department, role } = req.body;
        const facultyId = req.params.id;

        // Validate role exists and is active
        if (role) {
            const validRole = await Role.findOne({ _id: role, isActive: true });
            if (!validRole) {
                return res.status(400).json({ error: 'Invalid or inactive role selected' });
            }
        }

        const faculty = await Faculty.findOneAndUpdate(
            { _id: facultyId, isActive: true },
            {
                firstName,
                lastName,
                email,
                mobileNumber,
                gender,
                department,
                role
            },
            { new: true, runValidators: true }
        ).populate('role', 'name description');

        if (!faculty) {
            return res.status(404).json({ error: 'Faculty not found' });
        }

        res.json({
            message: 'Faculty updated successfully',
            faculty
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ 
                error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
            });
        }
        res.status(500).json({ error: 'Failed to update faculty' });
    }
});

/**
 * @swagger
 * /api/faculty/delete/{id}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: Delete a specific faculty profile
 *     tags: [Faculty]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Faculty ID
 *     responses:
 *       200:
 *         description: Faculty profile deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Faculty profile not found
 *       500:
 *         description: Server error
 */
router.delete('/delete/:id', auth, async (req, res) => {
    try {
        const faculty = await Faculty.findOneAndUpdate(
            { _id: req.params.id, isActive: true },
            { isActive: false },
            { new: true }
        );

        if (!faculty) {
            return res.status(404).json({ error: 'Faculty not found' });
        }

        res.json({ message: 'Faculty deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete faculty' });
    }
});

// Get all roles for faculty creation/update
router.get('/roles', auth, async (req, res) => {
    try {
        const roles = await Role.find({ isActive: true })
            .select('name description')
            .sort({ name: 1 });
        
        res.json({ roles });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});

module.exports = router; 