const express = require('express');
const router = express.Router();
const Faculty = require('../models/faculty');
const { auth } = require('../middleware/auth');

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

        // Validate required fields
        if (!firstName || !lastName || !email || !mobileNumber || !gender || !department || !role) {
            return res.status(400).json({ 
                error: 'All fields are required' 
            });
        }

        // Check if email is already used
        const existingEmail = await Faculty.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Check if mobile number is already used
        const existingMobile = await Faculty.findOne({ mobileNumber });
        if (existingMobile) {
            return res.status(400).json({ error: 'Mobile number already registered' });
        }

        // Create new faculty profile (without facultyId and employeeId - they'll be auto-generated)
        const faculty = new Faculty({
            firstName,
            lastName,
            email,
            mobileNumber,
            gender,
            department,
            role
        });

        await faculty.save();

        res.json({
            message: 'Faculty profile created successfully',
            faculty: {
                facultyId: faculty.facultyId,
                employeeId: faculty.employeeId,
                firstName: faculty.firstName,
                lastName: faculty.lastName,
                email: faculty.email,
                mobileNumber: faculty.mobileNumber,
                gender: faculty.gender,
                department: faculty.department,
                role: faculty.role
            }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to create faculty profile' });
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
        const faculty = await Faculty.find({ isActive: true });
        
        res.json({
            faculty: faculty.map(f => ({
                facultyId: f.facultyId,
                employeeId: f.employeeId,
                firstName: f.firstName,
                lastName: f.lastName,
                email: f.email,
                mobileNumber: f.mobileNumber,
                gender: f.gender,
                department: f.department,
                role: f.role
            }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch faculty profiles' });
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
 *             $ref: '#/components/schemas/Faculty'
 *     responses:
 *       200:
 *         description: Faculty profile updated successfully
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

        // Validate required fields
        if (!firstName || !lastName || !email || !mobileNumber || !gender || !department || !role) {
            return res.status(400).json({ 
                error: 'All fields are required' 
            });
        }

        // Find faculty profile by facultyId
        const faculty = await Faculty.findOne({ 
            facultyId: facultyId,
            isActive: true
        });

        if (!faculty) {
            return res.status(404).json({ error: 'Faculty profile not found' });
        }

        // Check if email is being changed and if it's already used
        if (email !== faculty.email) {
            const existingEmail = await Faculty.findOne({ email, facultyId: { $ne: facultyId } });
            if (existingEmail) {
                return res.status(400).json({ error: 'Email already registered' });
            }
        }

        // Check if mobile number is being changed and if it's already used
        if (mobileNumber !== faculty.mobileNumber) {
            const existingMobile = await Faculty.findOne({ mobileNumber, facultyId: { $ne: facultyId } });
            if (existingMobile) {
                return res.status(400).json({ error: 'Mobile number already registered' });
            }
        }

        // Update faculty profile
        faculty.firstName = firstName;
        faculty.lastName = lastName;
        faculty.email = email;
        faculty.mobileNumber = mobileNumber;
        faculty.gender = gender;
        faculty.department = department;
        faculty.role = role;

        await faculty.save();

        res.json({
            message: 'Faculty profile updated successfully',
            faculty: {
                facultyId: faculty.facultyId,
                employeeId: faculty.employeeId,
                firstName: faculty.firstName,
                lastName: faculty.lastName,
                email: faculty.email,
                mobileNumber: faculty.mobileNumber,
                gender: faculty.gender,
                department: faculty.department,
                role: faculty.role
            }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to update faculty profile' });
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
        const facultyId = req.params.id;
        
        const faculty = await Faculty.findOneAndUpdate(
            { 
                facultyId: facultyId,
                isActive: true
            },
            { isActive: false },
            { new: true }
        );
        
        if (!faculty) {
            return res.status(404).json({ error: 'Faculty profile not found. Please provide a valid Faculty ID.' });
        }

        res.json({
            message: 'Faculty profile deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete faculty profile' });
    }
});

module.exports = router; 