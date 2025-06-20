const express = require('express');
const router = express.Router();
const Class = require('../models/class');
const Faculty = require('../models/faculty');
const { auth } = require('../middleware/auth');
const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Class:
 *       type: object
 *       required:
 *         - name
 *         - section
 *         - academicYear
 *         - classTeacher
 *         - capacity
 *       properties:
 *         name:
 *           type: string
 *           description: Class name (must be unique)
 *         section:
 *           type: string
 *           description: Section identifier
 *         academicYear:
 *           type: string
 *           description: Academic year in YYYY-YYYY format
 *         classTeacher:
 *           type: string
 *           description: ObjectId of the faculty assigned as class teacher
 *         capacity:
 *           type: number
 *           description: Maximum number of students in the class
 *         description:
 *           type: string
 *           description: Class description
 */

/**
 * @swagger
 * /api/class/add:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Add a new class
 *     tags: [Class]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Class'
 *     responses:
 *       200:
 *         description: Class created successfully
 *       400:
 *         description: Validation error or duplicate class
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/add', auth, async (req, res) => {
    try {
        console.log('Request body:', req.body);
        console.log('User ID:', req.user._id);

        const { name, section, academicYear, classTeacher, capacity, description } = req.body;

        // Basic validation
        if (!name || !section || !academicYear || !classTeacher || !capacity) {
            return res.status(400).json({ 
                success: false,
                error: 'All required fields must be provided',
                missing: Object.entries({ name, section, academicYear, classTeacher, capacity })
                    .filter(([_, value]) => !value)
                    .map(([key]) => key)
            });
        }

        // Validate classTeacher ID format
        if (!mongoose.Types.ObjectId.isValid(classTeacher)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid class teacher ID format'
            });
        }

        // Check if faculty exists
        const faculty = await Faculty.findById(classTeacher);
        if (!faculty) {
            return res.status(400).json({
                success: false,
                error: 'Faculty not found'
            });
        }

        // Check if class with same name, section and academic year exists
        const existingClass = await Class.findOne({
            name: name.trim(),
            section: section.trim().toUpperCase(),
            academicYear: academicYear.trim()
        });

        if (existingClass) {
            return res.status(400).json({
                success: false,
                error: `Class "${name} ${section}" already exists for academic year ${academicYear}`
            });
        }

        // Create new class
        const classObj = new Class({
            name: name.trim(),
            section: section.trim().toUpperCase(),
            academicYear: academicYear.trim(),
            classTeacher,
            capacity: Number(capacity),
            description: description ? description.trim() : '',
            createdBy: req.user._id
        });

        console.log('Class object before save:', classObj);

        // Save the class
        const savedClass = await classObj.save();
        console.log('Class saved successfully:', savedClass);

        // Populate references
        await savedClass.populate([
            { path: 'classTeacher', select: 'firstName lastName employeeId' },
            { path: 'createdBy', select: 'firstName lastName' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Class created successfully',
            class: {
                id: savedClass._id,
                name: savedClass.name,
                section: savedClass.section,
                academicYear: savedClass.academicYear,
                classTeacher: {
                    id: savedClass.classTeacher._id,
                    name: `${savedClass.classTeacher.firstName} ${savedClass.classTeacher.lastName}`,
                    employeeId: savedClass.classTeacher.employeeId
                },
                capacity: savedClass.capacity,
                description: savedClass.description
            }
        });
    } catch (error) {
        console.error('Detailed error in class creation:', error);
        console.error('Error stack:', error.stack);

        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                success: false,
                error: Object.values(error.errors).map(err => err.message).join(', '),
                details: error.errors
            });
        }
        
        if (error.name === 'CastError') {
            return res.status(400).json({ 
                success: false,
                error: `Invalid ${error.path} format`,
                details: error
            });
        }

        if (error.code === 11000) {
            const errorMessage = error.keyPattern.name && !error.keyPattern.section ? 
                `Class "${req.body.name}" already exists` :
                `Class "${req.body.name} ${req.body.section}" already exists for academic year ${req.body.academicYear}`;

            return res.status(400).json({ 
                success: false,
                error: errorMessage,
                details: error.keyPattern
            });
        }

        res.status(500).json({ 
            success: false,
            error: 'Failed to create class. Please try again.',
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/class/list:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get all active classes
 *     tags: [Class]
 *     parameters:
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *         description: Filter by academic year (optional)
 *     responses:
 *       200:
 *         description: List of classes
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/list', auth, async (req, res) => {
    try {
        const classes = await Class.find()
            .populate('classTeacher', 'firstName lastName employeeId')
            .sort({ name: 1, section: 1 });
        
        res.json({
            success: true,
            classes: classes.map(c => ({
                id: c._id,
                name: c.name,
                section: c.section,
                academicYear: c.academicYear,
                classTeacher: {
                    id: c.classTeacher._id,
                    name: `${c.classTeacher.firstName} ${c.classTeacher.lastName}`,
                    employeeId: c.classTeacher.employeeId
                },
                capacity: c.capacity,
                description: c.description
            }))
        });
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch classes' 
        });
    }
});

/**
 * @swagger
 * /api/class/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get class by ID
 *     tags: [Class]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Class ID
 *     responses:
 *       200:
 *         description: Class details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Class not found
 *       500:
 *         description: Server error
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const classObj = await Class.findOne({ 
            _id: req.params.id,
            isActive: true 
        }).populate('classTeacher', 'firstName lastName');

        if (!classObj) {
            return res.status(404).json({ error: 'Class not found' });
        }

        res.json({ class: classObj });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch class details' });
    }
});

/**
 * @swagger
 * /api/class/edit/{id}:
 *   put:
 *     security:
 *       - bearerAuth: []
 *     summary: Edit a class
 *     tags: [Class]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Class ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Class'
 *     responses:
 *       200:
 *         description: Class updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Class not found
 *       500:
 *         description: Server error
 */
router.put('/edit/:id', auth, async (req, res) => {
    try {
        console.log('Edit request body:', req.body);
        const { name, section, academicYear, classTeacher, capacity, description } = req.body;

        // Basic validation
        if (!name || !section || !academicYear || !classTeacher || !capacity) {
            return res.status(400).json({ 
                success: false,
                error: 'All required fields must be provided',
                missing: Object.entries({ name, section, academicYear, classTeacher, capacity })
                    .filter(([_, value]) => !value)
                    .map(([key]) => key)
            });
        }

        // Find faculty by employee ID if it's not a MongoDB ObjectId
        let teacherId = classTeacher;
        if (!mongoose.Types.ObjectId.isValid(classTeacher)) {
            const faculty = await Faculty.findOne({ employeeId: classTeacher });
            if (!faculty) {
                return res.status(400).json({
                    success: false,
                    error: `Faculty with employee ID ${classTeacher} not found`
                });
            }
            teacherId = faculty._id;
        }

        // Check if the class exists
        const existingClass = await Class.findById(req.params.id);
        if (!existingClass) {
            return res.status(404).json({
                success: false,
                error: 'Class not found'
            });
        }

        // Check if the new name/section/year combination exists for another class
        const duplicateClass = await Class.findOne({
            _id: { $ne: req.params.id },
            name: name.trim(),
            section: section.trim().toUpperCase(),
            academicYear: academicYear.trim()
        });

        if (duplicateClass) {
            return res.status(400).json({
                success: false,
                error: `Class "${name} ${section}" already exists for academic year ${academicYear}`
            });
        }

        // Update the class
        const updatedClass = await Class.findByIdAndUpdate(
            req.params.id,
            {
                name: name.trim(),
                section: section.trim().toUpperCase(),
                academicYear: academicYear.trim(),
                classTeacher: teacherId,
                capacity: Number(capacity),
                description: description ? description.trim() : ''
            },
            { new: true, runValidators: true }
        ).populate('classTeacher', 'firstName lastName employeeId');

        if (!updatedClass) {
            return res.status(404).json({
                success: false,
                error: 'Class not found'
            });
        }

        res.json({
            success: true,
            message: 'Class updated successfully',
            class: {
                id: updatedClass._id,
                name: updatedClass.name,
                section: updatedClass.section,
                academicYear: updatedClass.academicYear,
                classTeacher: {
                    id: updatedClass.classTeacher._id,
                    name: `${updatedClass.classTeacher.firstName} ${updatedClass.classTeacher.lastName}`,
                    employeeId: updatedClass.classTeacher.employeeId
                },
                capacity: updatedClass.capacity,
                description: updatedClass.description
            }
        });
    } catch (error) {
        console.error('Error updating class:', error);
        console.error('Error stack:', error.stack);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: Object.values(error.errors).map(err => err.message).join(', ')
            });
        }

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: 'Invalid class ID format'
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: `Class "${req.body.name} ${req.body.section}" already exists for academic year ${req.body.academicYear}`
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to update class'
        });
    }
});

/**
 * @swagger
 * /api/class/delete/{id}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: Permanently delete a class
 *     tags: [Class]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Class ID
 *     responses:
 *       200:
 *         description: Class deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Class not found
 *       500:
 *         description: Server error
 */
router.delete('/delete/:id', auth, async (req, res) => {
    try {
        const deletedClass = await Class.findByIdAndDelete(req.params.id);

        if (!deletedClass) {
            return res.status(404).json({ 
                success: false,
                error: 'Class not found' 
            });
        }

        res.json({ 
            success: true,
            message: 'Class deleted successfully',
            deletedClass: {
                id: deletedClass._id,
                name: deletedClass.name,
                section: deletedClass.section,
                academicYear: deletedClass.academicYear
            }
        });
    } catch (error) {
        console.error('Error deleting class:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid class ID format' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete class' 
        });
    }
});

/**
 * @swagger
 * /api/class/search-faculty:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Search faculty by name
 *     tags: [Class]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *         description: Faculty name to search (first name or last name)
 *     responses:
 *       200:
 *         description: List of matching faculty members
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/search-faculty', auth, async (req, res) => {
    try {
        const { name } = req.query;
        
        if (!name) {
            return res.status(400).json({ error: 'Name parameter is required' });
        }

        const faculty = await Faculty.find({
            $or: [
                { firstName: new RegExp(name, 'i') },
                { lastName: new RegExp(name, 'i') }
            ],
            isActive: true
        }).select('_id firstName lastName employeeId department');

        res.json({ faculty });
    } catch (error) {
        res.status(500).json({ error: 'Failed to search faculty' });
    }
});

// Search faculty by employee ID
router.get('/search-faculty/:employeeId', auth, async (req, res) => {
    try {
        const faculty = await Faculty.findOne({ employeeId: req.params.employeeId });
        if (!faculty) {
            return res.status(404).json({
                success: false,
                error: 'Faculty not found'
            });
        }

        res.json({
            success: true,
            faculty: {
                id: faculty._id,
                employeeId: faculty.employeeId,
                name: `${faculty.firstName} ${faculty.lastName}`
            }
        });
    } catch (error) {
        console.error('Error searching faculty:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search faculty'
        });
    }
});

module.exports = router; 