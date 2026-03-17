const express = require("express");
const credentialController = require("../controllers/credentialController");
const router = express.Router();

router.get("/dashboard", credentialController.getDashboardCredentials);
router.post("/:categoryId", credentialController.getCredentialsByCategory);
router.post("/new/credential", credentialController.addCredential);
router.get("/:id/password", credentialController.getCredentialPassword);
router.get("/:id", credentialController.getEditingCredential);
router.put("/:id", credentialController.updateCredential);
router.delete("/:id", credentialController.deleteCredential);

module.exports = router;
