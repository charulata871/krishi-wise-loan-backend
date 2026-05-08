const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();
const SECRET = "krishi_secret_key";

router.post("/login", (req, res) => {
  const { name } = req.body;

  const token = jwt.sign({ name }, SECRET, { expiresIn: "1d" });

  res.json({
    token,
    user: { name }
  });
});

module.exports = router;