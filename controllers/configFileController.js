const ConfigFile = require("../model/ConfigFile");

exports.getDashboardConfigFiles = async (req, res) => {
  try {
    const [count] = await Promise.all([ConfigFile.countDocuments()]);

    return res.status(200).json({
      status: 200,
      message: "Dashboard configuration files count retrieved successfully",
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

exports.getConfigFilesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const filter =
      categoryId && categoryId !== "all" ? { category: categoryId } : {};

    const configFiles = await ConfigFile.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: configFiles,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.addConfigFile = async (req, res) => {
  try {
    const { category, title, description, code } = req.body;

    if (!category || !title) {
      return res.status(400).json({
        success: false,
        message: "Category and title are required",
      });
    }

    const newConfigFile = await ConfigFile.create({
      category,
      title,
      description,
      code,
    });

    res.status(201).json({
      success: true,
      message: "Configuration file added successfully",
      data: newConfigFile,
    });
  } catch (error) {
    console.error("Error creating configuration file:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create configuration file",
    });
  }
};

exports.getEditingConfigFile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Configuration file ID is required",
      });
    }

    const configFile = await ConfigFile.findById(id);

    if (!configFile) {
      return res.status(404).json({
        success: false,
        message: "Configuration file not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Editing configuration file fetched",
      configFile,
    });
  } catch (error) {
    console.error("Fetch editing configuration file error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch configuration file",
    });
  }
};

exports.updateConfigFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, title, description, code } = req.body;

    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid configuration file ID",
      });
    }

    const updatedConfigFile = await ConfigFile.findByIdAndUpdate(
      id,
      { category, title, description, code },
      { returnDocument: "after" },
    );

    if (!updatedConfigFile) {
      return res.status(404).json({
        success: false,
        message: "Configuration file not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Configuration file updated successfully",
      script: updatedConfigFile,
    });
  } catch (error) {
    console.error("Update configuration file error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update configuration file",
    });
  }
};

exports.deleteConfigFile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Configuration file ID is required",
      });
    }

    const configFile = await ConfigFile.findById(id);

    if (!configFile) {
      return res.status(404).json({
        success: false,
        message: "Configuration file not found",
      });
    }

    await configFile.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Configuration file deleted successfully",
    });
  } catch (error) {
    console.error("Delete configuration file error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to configuration file script",
    });
  }
};
