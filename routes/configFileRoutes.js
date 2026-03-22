const express = require("express");
const configFileController = require("../controllers/configFileController");
const router = express.Router();

router.get("/dashboard", configFileController.getDashboardConfigFiles);
router.post("/:categoryId", configFileController.getConfigFilesByCategory);
router.post("/new/file", configFileController.addConfigFile);
router.get("/:id", configFileController.getEditingConfigFile);
router.put("/:id", configFileController.updateConfigFile);
router.delete("/delete/:id", configFileController.deleteConfigFile);

module.exports = router;
