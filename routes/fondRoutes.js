const express = require("express");
const fondController = require("../controllers/fondController");
const router = express.Router();

router.get("/search", fondController.searchFond);
router.post("/import", importFondet);

module.exports = router;
