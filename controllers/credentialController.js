const Credential = require("../model/Credential");

exports.getDashboardCredentials = async (req, res) => {
  try {
    const [count, recentCredentials] = await Promise.all([
      Credential.countDocuments(),
      Credential.find().sort({ createdAt: -1 }).limit(3).select("-password"),
    ]);

    return res.status(200).json({
      status: 200,
      message: "Dashboard credentials data retrieved successfully",
      data: {
        count,
        recent: recentCredentials,
      },
    });
  } catch (error) {
    console.error("DASHBOARD ERROR:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
    });
  }
};

exports.getCredentialsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const filter =
      categoryId && categoryId !== "all" ? { category: categoryId } : {};

    const credentials = await Credential.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: credentials,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.getCredentialPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const credential = await Credential.findById(id);

    if (!credential) {
      return res.status(404).json({
        success: false,
        message: "Credential not found",
      });
    }

    const decryptedPassword = credential.getDecryptedPassword();

    res.status(200).json({
      success: true,
      password: decryptedPassword,
    });
  } catch (error) {
    console.error("Fetch password error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.addCredential = async (req, res) => {
  try {
    const { category, username, password, url, title } = req.body;

    if (!category || !title) {
      return res.status(400).json({
        success: false,
        message: "Category and title are required",
      });
    }

    const newCredential = await Credential.create({
      category,
      username,
      password,
      url,
      title,
    });

    res.status(201).json({
      success: true,
      message: "Credential added successfully",
      data: newCredential.toSafeObject(),
    });
  } catch (error) {
    console.error("Error creating credential:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create credential",
    });
  }
};

exports.getEditingCredential = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Credential ID is required",
      });
    }

    const credential = await Credential.findById(id);

    if (!credential) {
      return res.status(404).json({
        success: false,
        message: "Credential not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Editing credential fetched",
      credential,
    });
  } catch (error) {
    console.error("Fetch editing credential error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch credential",
    });
  }
};

exports.updateCredential = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, username, password, url, title } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Credential ID is required",
      });
    }

    if (!category || !title) {
      return res.status(400).json({
        success: false,
        message: "Category and title are required",
      });
    }

    const credential = await Credential.findById(id);

    if (!credential) {
      return res.status(404).json({
        success: false,
        message: "Credential not found",
      });
    }

    credential.category = category;
    credential.username = username;
    credential.url = url;
    credential.title = title;

    if (password && password.trim() !== "") {
      credential.password = password;
    }

    await credential.save();

    const updated = credential.toSafeObject();

    return res.status(200).json({
      success: true,
      message: "Credential updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update credential error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update credential",
    });
  }
};

exports.deleteCredential = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Credential ID is required",
      });
    }

    const credential = await Credential.findById(id);

    if (!credential) {
      return res.status(404).json({
        success: false,
        message: "Credential not found",
      });
    }

    await credential.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Credential deleted successfully",
    });
  } catch (error) {
    console.error("Delete credential error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete credential",
    });
  }
};
