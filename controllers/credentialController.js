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
