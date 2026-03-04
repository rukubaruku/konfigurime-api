const express = require("express");
const router = express.Router();
const modulesController = require("../controllers/modulesController");

router.get("/modules", modulesController.getAllModules);

module.exports = router;
