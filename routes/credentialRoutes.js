const express = require("express");
const credentialController = require("../controllers/credentialController");
const router = express.Router();

router.get("/dashboard", credentialController.getDashboardCredentials);

module.exports = router;
