const express = require("express");
const scriptController = require("../controllers/scripController");
const router = express.Router();

router.get("/dashboard", scriptController.getDashboardScripts);
router.post("/:categoryId", scriptController.getScriptsByCategory);
router.post("/new/script", scriptController.addScript);

module.exports = router;
