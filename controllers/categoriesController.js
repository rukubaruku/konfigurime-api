const Category = require("../model/Category");
const Module = require("../model/Module");

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .populate("module", "name")
      .sort({ module: 1, sortOrder: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, moduleId } = req.body;

    if (!name || !moduleId) {
      return res.status(400).json({
        success: false,
        message: "Name and module are required",
      });
    }

    const module = await Module.findById(moduleId);

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module not found",
      });
    }

    const lastCategory = await Category.findOne({
      module: moduleId,
    }).sort({ sortOrder: -1 });

    const nextSortOrder = lastCategory ? lastCategory.sortOrder + 1 : 1;

    const category = await Category.create({
      name: name.trim(),
      module: moduleId,
      sortOrder: nextSortOrder,
    });

    await category.populate("module", "name");

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error creating category:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (name?.trim()) {
      category.name = name.trim();
    }

    await category.save();
    await category.populate("module", "name");

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error updating category:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const moduleId = category.module;
    const deletedSortOrder = category.sortOrder;

    await category.deleteOne();

    await Category.updateMany(
      {
        module: moduleId,
        sortOrder: { $gt: deletedSortOrder },
      },
      {
        $inc: { sortOrder: -1 },
      },
    );

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete category",
    });
  }
};

exports.getCategoriesByModule = async (req, res) => {
  try {
    const { module } = req.body;

    if (!module) {
      return res.status(400).json({
        success: false,
        message: "Module name is required",
      });
    }

    const moduleDoc = await Module.findOne({ name: module });

    if (!moduleDoc) {
      return res.status(404).json({
        success: false,
        message: "Module not found",
      });
    }

    const categories = await Category.find({
      module: moduleDoc._id,
    })
      .populate("module", "name")
      .sort({ sortOrder: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories by module:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

exports.reorderCategories = async (req, res) => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Categories are required",
      });
    }

    const bulkOperations = categories.map((category) => ({
      updateOne: {
        filter: { _id: category.id },
        update: {
          $set: {
            sortOrder: category.sortOrder,
          },
        },
      },
    }));

    await Category.bulkWrite(bulkOperations);

    res.status(200).json({
      success: true,
      message: "Categories reordered successfully",
    });
  } catch (error) {
    console.error("Error reordering categories:", error);

    res.status(500).json({
      success: false,
      message: "Failed to reorder categories",
    });
  }
};
