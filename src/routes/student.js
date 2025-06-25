const express = require('express');
const router = express.Router();
const Student = require('../models/student');
const User = require('../models/user');
const { auth } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Student:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - mobileNumber
 *       properties:
 *         firstName:
 *           type: string
 *           description: Student's first name
 *         lastName:
 *           type: string
 *           description: Student's last name
 *         email:
 *           type: string
 *           description: Student's email address (must be unique)
 *         mobileNumber:
 *           type: string
 *           description: Student's mobile number (must be unique)
 */

/**
 * @swagger
 * /api/student/add:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Add a new student profile
 *     tags: [Student]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Student'
 *     responses:
 *       200:
 *         description: Student profile created successfully
 *       400:
 *         description: Validation error or mobile number/email already exists
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/add', auth, async (req, res) => {
    try {
        const { firstName, lastName, email, mobileNumber } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !mobileNumber) {
            return res.status(400).json({ 
                error: 'All fields (firstName, lastName, email, mobileNumber) are required' 
            });
        }

        // Check if mobile number is already used
        const existingMobile = await User.findOne({ mobileNumber });
        if (existingMobile) {
            return res.status(400).json({ error: 'Mobile number already registered' });
        }

        // Check if email is already used
        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create new user with student role
        const user = new User({
            firstName,
            lastName,
            email: email.toLowerCase(),
            mobileNumber,
            password: 'Student123', // Default password for students
            role: 'student',
            isActive: true
        });

        await user.save();

        res.json({
            message: 'Student profile created successfully',
            student: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                mobileNumber: user.mobileNumber
            }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to create student profile' });
    }
});

/**
 * @swagger
 * /api/student/list:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get all student profiles for the authenticated user
 *     tags: [Student]
 *     responses:
 *       200:
 *         description: List of student profiles
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/list', auth, async (req, res) => {
    try {
        const students = await User.find({ 
            role: 'student'
        }).select('_id firstName lastName mobileNumber email');
        
        res.json({
            students: students.map(student => ({
                id: student._id,
                firstName: student.firstName,
                lastName: student.lastName,
                mobileNumber: student.mobileNumber,
                email: student.email
            }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch student profiles' });
    }
});

/**
 * @swagger
 * /api/student/edit/{id}:
 *   put:
 *     security:
 *       - bearerAuth: []
 *     summary: Edit a specific student profile
 *     tags: [Student]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student profile ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Student'
 *     responses:
 *       200:
 *         description: Student profile updated successfully
 *       400:
 *         description: Validation error or mobile number already exists
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Student profile not found
 *       500:
 *         description: Server error
 */
router.put('/edit/:id', auth, async (req, res) => {
    try {
        const { firstName, lastName, mobileNumber, email } = req.body;
        const studentId = req.params.id;

        // Validate required fields
        if (!firstName || !lastName || !mobileNumber || !email) {
            return res.status(400).json({ 
                error: 'All fields (firstName, lastName, mobileNumber, email) are required' 
            });
        }

        // Find student profile
        const student = await User.findById(studentId);

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        if (student.role !== 'student') {
            return res.status(400).json({ error: 'User is not a student' });
        }

        // Check if mobile number is being changed and if it's already used
        if (mobileNumber !== student.mobileNumber) {
            const existingMobile = await User.findOne({ 
                _id: { $ne: studentId },
                mobileNumber 
            });
            if (existingMobile) {
                return res.status(400).json({ error: 'Mobile number already registered' });
            }
        }

        // Check if email is being changed and if it's already used
        if (email.toLowerCase() !== student.email) {
            const existingEmail = await User.findOne({ 
                _id: { $ne: studentId },
                email: email.toLowerCase() 
            });
            if (existingEmail) {
                return res.status(400).json({ error: 'Email already registered' });
            }
        }

        // Update student profile
        student.firstName = firstName;
        student.lastName = lastName;
        student.mobileNumber = mobileNumber;
        student.email = email.toLowerCase();

        const updatedStudent = await student.save();

        res.json({
            message: 'Student profile updated successfully',
            student: {
                id: updatedStudent._id,
                firstName: updatedStudent.firstName,
                lastName: updatedStudent.lastName,
                mobileNumber: updatedStudent.mobileNumber,
                email: updatedStudent.email
            }
        });
    } catch (error) {
        console.error('Error updating student:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid student ID format' });
        }
        res.status(500).json({ 
            error: 'Failed to update student profile',
            details: error.message 
        });
    }
});

/**
 * @swagger
 * /api/student/delete/{id}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: Delete a specific student profile
 *     tags: [Student]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student profile ID
 *     responses:
 *       200:
 *         description: Student profile deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Student profile not found
 *       500:
 *         description: Server error
 */
router.delete('/delete/:id', auth, async (req, res) => {
    try {
        const studentId = req.params.id;
        
        // First find the student to verify it exists and is a student
        const student = await User.findById(studentId);
        
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        if (student.role !== 'student') {
            return res.status(400).json({ error: 'User is not a student' });
        }

        // Delete the student
        await User.findByIdAndDelete(studentId);

        res.json({
            message: 'Student deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting student:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid student ID format' });
        }
        res.status(500).json({ 
            error: 'Failed to delete student',
            details: error.message 
        });
    }
});

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Change user's password
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
 *                 description: Current password of the user
 *               newPassword:
 *                 type: string
 *                 description: New password (minimum 6 characters)
 *             example:
 *               currentPassword: "oldPassword123"
 *               newPassword: "newPassword123"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password changed successfully"
 *       400:
 *         description: Validation error or incorrect current password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Current password is incorrect"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Validate required fields
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                error: 'Both current password and new password are required' 
            });
        }

        // Validate new password length
        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'New password must be at least 6 characters long'
            });
        }

        // Get the user from the database
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Update password
        user.password = newPassword;
        await user.save(); // This will trigger the password hashing middleware

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to change password' });
    }
});

module.exports = router; 