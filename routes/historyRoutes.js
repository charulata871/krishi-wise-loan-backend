const express = require("express");
const auth = require("../middleware/auth");
const History = require("../models/History");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  const data = await History.find({ name: req.user.name });
  res.json(data);
});

module.exports = router;