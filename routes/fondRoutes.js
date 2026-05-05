const express = require("express");
const fondController = require("../controllers/fondController");
const router = express.Router();

router.get("/search", fondController.searchFond);
router.post("/import", fondController.importFondet);
router.get("/import-status", fondController.getImportStatus);

module.exports = router;
