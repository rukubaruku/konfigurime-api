const Command = require("../model/Command");

exports.getDashboardCommands = async (req, res) => {
  try {
    const [count] = await Promise.all([Command.countDocuments()]);

    return res.status(200).json({
      status: 200,
      message: "Dashboard commands count retrieved successfully",
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

exports.getCommandsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const filter =
      categoryId && categoryId !== "all" ? { category: categoryId } : {};

    const commands = await Command.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: commands,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.addCommand = async (req, res) => {
  try {
    const { category, title, description, code } = req.body;

    if (!category || !title) {
      return res.status(400).json({
        success: false,
        message: "Category and title are required",
      });
    }

    const newCommand = await Command.create({
      category,
      title,
      description,
      code,
    });

    res.status(201).json({
      success: true,
      message: "Command added successfully",
      data: newCommand,
    });
  } catch (error) {
    console.error("Error creating command:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create command",
    });
  }
};

exports.getEditingCommand = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Command ID is required",
      });
    }

    const command = await Command.findById(id);

    if (!command) {
      return res.status(404).json({
        success: false,
        message: "Command not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Editing command fetched",
      command,
    });
  } catch (error) {
    console.error("Fetch editing command error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch command",
    });
  }
};

exports.updateCommand = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, title, description, code } = req.body;

    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid command ID",
      });
    }

    const updatedCommand = await Command.findByIdAndUpdate(
      id,
      { category, title, description, code },
      { returnDocument: "after" },
    );

    if (!updatedCommand) {
      return res.status(404).json({
        success: false,
        message: "Command not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Command updated successfully",
      script: updatedCommand,
    });
  } catch (error) {
    console.error("Update command error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update command",
    });
  }
};

exports.deleteCommand = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Command ID is required",
      });
    }

    const command = await Command.findById(id);

    if (!command) {
      return res.status(404).json({
        success: false,
        message: "Command not found",
      });
    }

    await command.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Command deleted successfully",
    });
  } catch (error) {
    console.error("Delete command error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete command",
    });
  }
};
