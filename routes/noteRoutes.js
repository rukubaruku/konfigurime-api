const express = require("express");
const notesController = require("../controllers/notesController");
const router = express.Router();

router.get("/dashboard", notesController.getDashboardNotes);
router.post("/:categoryId", notesController.getNotesByCategory);
router.post("/new/note", notesController.addNote);
router.get("/:id", notesController.getEditingNote);
router.put("/:id", notesController.updateNote);
router.delete("/delete/:id", notesController.deleteNote);

module.exports = router;
