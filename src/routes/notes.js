const express = require('express');

const router = express.Router();

const Note = require('../models/note');

// add the notes
router.post("/add", async function (req, res) {

    try {
        const newNotes = Note({
            id: req.body.id,
            userId: req.body.userId,
            title: req.body.title,
            content: req.body.content
        });
        await newNotes.save();
        const response =
        {
            message: `New Note created! ID: ${req.body.id}`
        }
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: "Failed to add the note" });
    }

})

// get the related list according the userid
router.post("/list", async function (req, res) {
    try {
        const notes = await Note.find({
            userId: req.body.userId
        });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch notes" });
    }

})

// get the all list
router.get("/list", async function (req, res) {
    try {
        const notes = await Note.find();
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch notes list" });
    }

})

// delete the related note
router.post("/delete", async function (req, res) {
    try {
        await Note.deleteOne({ id: req.body.id });
        const response =
        {
            message: `Note Deleted! ID: ${req.body.id}`
        }
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: `Failed to delete ID :${req.body.id} ` })
    }

})

module.exports = router;
