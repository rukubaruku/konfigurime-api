const express = require("express");
const userController = require("../controllers/userController");
const { verifyToken } = require("../utils/authMiddleware");
const router = express.Router();

router.post("/login", userController.login);
router.get("/:id", userController.getUserById);
router.put("/update", userController.updateUser);
router.put("/change-password", userController.changePassword);

module.exports = router;
