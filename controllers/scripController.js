const Script = require("../model/Script");

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
