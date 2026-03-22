const Note = require("../model/Note");
const mongoose = require("mongoose");

exports.getDashboardNotes = async (req, res) => {
  try {
    const [count] = await Promise.all([Note.countDocuments()]);

    return res.status(200).json({
      status: 200,
      message: "Dashboard notes count retrieved successfully",
      data: { count },
    });
  } catch (error) {
    console.error("DASHBOARD ERROR:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
    });
  }
};

exports.getNotesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const filter =
      categoryId && categoryId !== "all" ? { category: categoryId } : {};

    const notes = await Note.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: notes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.addNote = async (req, res) => {
  try {
    const { category, title, description, content } = req.body;

    if (!category || !title) {
      return res.status(400).json({
        success: false,
        message: "Category and title are required",
      });
    }

    const newNote = await Note.create({
      category,
      title,
      description,
      content,
    });

    res.status(201).json({
      success: true,
      message: "note added successfully",
      data: newNote,
    });
  } catch (error) {
    console.error("Error creating note:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create note",
    });
  }
};

exports.getEditingNote = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Note ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID",
      });
    }

    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Editing note fetched",
      note,
    });
  } catch (error) {
    console.error("Fetch editing note error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch note",
    });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, title, description, content } = req.body;

    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID",
      });
    }

    const updatedNote = await Note.findByIdAndUpdate(
      id,
      { category, title, description, content },
      { returnDocument: "after" },
    );

    if (!updatedNote) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Note updated successfully",
      script: updatedNote,
    });
  } catch (error) {
    console.error("Update note error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update note",
    });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Note ID is required",
      });
    }

    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    await note.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("Delete note error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete note",
    });
  }
};
