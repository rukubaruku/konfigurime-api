const Script = require("../model/Script");

exports.getDashboardScripts = async (req, res) => {
  try {
    const [count] = await Promise.all([Script.countDocuments()]);

    return res.status(200).json({
      status: 200,
      message: "Dashboard scripts count retrieved successfully",
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

exports.getScriptsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const filter =
      categoryId && categoryId !== "all" ? { category: categoryId } : {};

    const scripts = await Script.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: scripts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.addScript = async (req, res) => {
  try {
    const { category, language, title, description, code } = req.body;

    if (!category || !language || !title) {
      return res.status(400).json({
        success: false,
        message: "Category, language and title are required",
      });
    }

    const newScript = await Script.create({
      category,
      language,
      title,
      description,
      code,
    });

    res.status(201).json({
      success: true,
      message: "Script added successfully",
      data: newScript,
    });
  } catch (error) {
    console.error("Error creating script:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create script",
    });
  }
};

exports.getEditingScript = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Script ID is required",
      });
    }

    const script = await Script.findById(id);

    if (!script) {
      return res.status(404).json({
        success: false,
        message: "Script not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Editing script fetched",
      script,
    });
  } catch (error) {
    console.error("Fetch editing script error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch script",
    });
  }
};

exports.updateScript = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, language, title, description, code } = req.body;

    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid script ID",
      });
    }

    const updatedScript = await Script.findByIdAndUpdate(
      id,
      { category, language, title, description, code },
      { returnDocument: "after" }, 
    );

    if (!updatedScript) {
      return res.status(404).json({
        success: false,
        message: "Script not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Script updated successfully",
      script: updatedScript,
    });
  } catch (error) {
    console.error("Update script error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update script",
    });
  }
};

exports.deleteScript = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Script ID is required",
      });
    }

    const script = await Script.findById(id);

    if (!script) {
      return res.status(404).json({
        success: false,
        message: "Script not found",
      });
    }

    await script.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Script deleted successfully",
    });
  } catch (error) {
    console.error("Delete script error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete script",
    });
  }
};
