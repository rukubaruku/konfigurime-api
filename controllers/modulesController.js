const Module = require("../model/Module");

exports.getAllModules = async (req, res) => {
  try {
    const modules = await Module.find().sort({ name: 1 });

    res.status(200).json({
      success: true,
      message: "Modules fetched successfully",
      data: modules,
    });
  } catch (error) {
    console.error("Error fetching modules:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch modules",
    });
  }
};
