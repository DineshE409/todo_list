const express = require("express");
const router = express.Router();
const auth = require("../controller/authController");

router.post("/todos", auth.todos);

router.get("/todos", auth.gettodos);

router.put("/todos/:id", auth.updatetodos);

router.delete("/todos/:id", auth.removetodos);

router.post("/login", auth.login);
router.post("/register", auth.register);

router.put("/todos/reorder", auth.reorderTodos);
router.post("/todos/log", auth.logTask);
router.post("/todos/log-bulk", auth.logTaskBulk);
router.get("/todos/metrics", auth.getMetrics);

module.exports = router;