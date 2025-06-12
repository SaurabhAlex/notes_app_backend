const express = require('express');
const router = express.Router();
const Note = require('../models/note');
const { auth } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Note:
 *       type: object
 *       required:
 *         - id
 *         - userId
 *         - title
 *         - content
 *       properties:
 *         id:
 *           type: string
 *           description: The unique identifier for the note
 *         userId:
 *           type: string
 *           description: The user ID who owns the note
 *         title:
 *           type: string
 *           description: The title of the note
 *         content:
 *           type: string
 *           description: The content of the note
 */

/**
 * @swagger
 * /add:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Create a new note
 *     tags: [Notes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Note'
 *     responses:
 *       200:
 *         description: Note created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to add the note
 */
router.post("/add", auth, async function (req, res) {
    try {
        await Note.deleteOne({ id: req.body.id });
        const newNotes = Note({
            id: req.body.id,
            userId: req.user.userId,
            title: req.body.title,
            content: req.body.content
        });
        await newNotes.save();
        const response = {
            message: `New Note created! ID: ${req.body.id}`
        }
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: "Failed to add the note" });
    }
});

/**
 * @swagger
 * /list:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Get notes by user ID
 *     tags: [Notes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: List of notes for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Note'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch notes
 */
router.post("/list", auth, async function (req, res) {
    try {
        const notes = await Note.find({
            userId: req.user.userId
        });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch notes" });
    }
});

/**
 * @swagger
 * /list:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get all notes
 *     tags: [Notes]
 *     responses:
 *       200:
 *         description: List of all notes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Note'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch notes list
 */
router.get("/list", auth, async function (req, res) {
    try {
        const notes = await Note.find();
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch notes list" });
    }
});

/**
 * @swagger
 * /delete:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Delete a note
 *     tags: [Notes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Note deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to delete note
 */
router.post("/delete", auth, async function (req, res) {
    try {
        await Note.deleteOne({ id: req.body.id, userId: req.user.userId });
        const response = {
            message: `Note Deleted! ID: ${req.body.id}`
        }
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: `Failed to delete ID :${req.body.id} ` })
    }
});

module.exports = router;
