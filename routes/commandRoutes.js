const express = require("express");
const commandsController = require("../controllers/commandsController");
const router = express.Router();

router.get("/dashboard", commandsController.getDashboardCommands);
router.post("/:categoryId", commandsController.getCommandsByCategory);
router.post("/new/command", commandsController.addCommand);
router.get("/:id", commandsController.getEditingCommand);
router.put("/:id", commandsController.updateCommand);
router.delete("/delete/:id", commandsController.deleteCommand);

module.exports = router;
