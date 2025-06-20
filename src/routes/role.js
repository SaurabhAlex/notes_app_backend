const express = require('express');
const router = express.Router();
const Role = require('../models/role');
const { auth } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Role:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: Role name (must be unique)
 *         description:
 *           type: string
 *           description: Role description
 */

/**
 * @swagger
 * /api/role/add:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Add a new role (Admin only)
 *     tags: [Role]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Role'
 *     responses:
 *       200:
 *         description: Role created successfully
 *       400:
 *         description: Validation error or duplicate role
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/add', auth, async (req, res) => {
    try {
        const { name, description } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({ 
                error: 'Role name is required' 
            });
        }

        // Check if role already exists
        const existingRole = await Role.findOne({ name: name.trim() });
        if (existingRole) {
            return res.status(400).json({ error: 'Role already exists' });
        }

        // Create new role
        const role = new Role({
            name: name.trim(),
            description: description ? description.trim() : '',
            createdBy: req.user._id
        });

        await role.save();

        res.json({
            message: 'Role created successfully',
            role: {
                id: role._id,
                name: role.name,
                description: role.description
            }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to create role' });
    }
});

/**
 * @swagger
 * /api/role/list:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get all active roles
 *     tags: [Role]
 *     responses:
 *       200:
 *         description: List of roles
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/list', auth, async (req, res) => {
    try {
        const roles = await Role.find({ isActive: true })
            .select('name description')
            .sort({ name: 1 });
        
        res.json({ roles });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});

/**
 * @swagger
 * /api/role/edit/{id}:
 *   put:
 *     security:
 *       - bearerAuth: []
 *     summary: Edit a role (Admin only)
 *     tags: [Role]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Role'
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Validation error or duplicate role
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 */
router.put('/edit/:id', auth, async (req, res) => {
    try {
        const { name, description } = req.body;
        const roleId = req.params.id;

        // Validate required fields
        if (!name) {
            return res.status(400).json({ 
                error: 'Role name is required' 
            });
        }

        // Find role
        const role = await Role.findOne({ 
            _id: roleId,
            isActive: true
        });

        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        // Check if new name already exists (excluding current role)
        if (name !== role.name) {
            const existingRole = await Role.findOne({ 
                name: name.trim(),
                _id: { $ne: roleId }
            });
            if (existingRole) {
                return res.status(400).json({ error: 'Role name already exists' });
            }
        }

        // Update role
        role.name = name.trim();
        role.description = description ? description.trim() : '';

        await role.save();

        res.json({
            message: 'Role updated successfully',
            role: {
                id: role._id,
                name: role.name,
                description: role.description
            }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to update role' });
    }
});

/**
 * @swagger
 * /api/role/delete/{id}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: Delete a role (Admin only)
 *     tags: [Role]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 */
router.delete('/delete/:id', auth, async (req, res) => {
    try {
        const roleId = req.params.id;
        
        const role = await Role.findOneAndUpdate(
            { 
                _id: roleId,
                isActive: true
            },
            { isActive: false },
            { new: true }
        );
        
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        res.json({
            message: 'Role deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete role' });
    }
});

module.exports = router; 