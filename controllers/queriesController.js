const Query = require("../model/Query");

exports.getDashboardQueries = async (req, res) => {
  try {
    const [count] = await Promise.all([Query.countDocuments()]);

    return res.status(200).json({
      status: 200,
      message: "Dashboard queries count retrieved successfully",
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

exports.getQueriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const filter =
      categoryId && categoryId !== "all" ? { category: categoryId } : {};

    const queries = await Query.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: queries,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.addQuery = async (req, res) => {
  try {
    const { category, title, description, code } = req.body;

    if (!category || !title) {
      return res.status(400).json({
        success: false,
        message: "Category and title are required",
      });
    }

    const newQuery = await Query.create({
      category,
      title,
      description,
      code,
    });

    res.status(201).json({
      success: true,
      message: "Query added successfully",
      data: newQuery,
    });
  } catch (error) {
    console.error("Error creating query:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create query",
    });
  }
};

exports.getEditingQuery = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Query ID is required",
      });
    }

    const query = await Query.findById(id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: "Query not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Editing query fetched",
      query,
    });
  } catch (error) {
    console.error("Fetch editing query error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch query",
    });
  }
};

exports.updateQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, title, description, code } = req.body;

    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid query ID",
      });
    }

    const updatedQuery = await Query.findByIdAndUpdate(
      id,
      { category, title, description, code },
      { returnDocument: "after" },
    );

    if (!updatedQuery) {
      return res.status(404).json({
        success: false,
        message: "Query not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Query updated successfully",
      script: updatedQuery,
    });
  } catch (error) {
    console.error("Update query error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update query",
    });
  }
};

exports.deleteQuery = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Query ID is required",
      });
    }

    const query = await Query.findById(id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: "Query not found",
      });
    }

    await query.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Query deleted successfully",
    });
  } catch (error) {
    console.error("Delete query error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete query",
    });
  }
};
