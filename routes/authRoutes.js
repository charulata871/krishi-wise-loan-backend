const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();
const SECRET = "krishi_secret_key";

router.post("/login", (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const token = jwt.sign({ name }, SECRET, { expiresIn: "1d" });

    res.json({
      token,
      user: { name }
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;