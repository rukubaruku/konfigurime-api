const express = require("express");
const scriptController = require("../controllers/scripController");
const router = express.Router();

router.get("/dashboard", scriptController.getDashboardScripts);
router.post("/:categoryId", scriptController.getScriptsByCategory);
router.post("/new/script", scriptController.addScript);
router.get("/:id", scriptController.getEditingScript);
router.put("/:id", scriptController.updateScript);
router.delete("/delete/:id", scriptController.deleteScript);

module.exports = router;
