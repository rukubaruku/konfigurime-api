const express = require("express");
const queriesController = require("../controllers/queriesController");
const router = express.Router();

router.get("/dashboard", queriesController.getDashboardQueries);
router.post("/:categoryId", queriesController.getQueriesByCategory);
router.post("/new/query", queriesController.addQuery);
router.get("/:id", queriesController.getEditingQuery);
router.put("/:id", queriesController.updateQuery);
router.delete("/delete/:id", queriesController.deleteQuery);

module.exports = router;
