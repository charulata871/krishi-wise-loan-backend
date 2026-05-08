const express = require("express");
const axios = require("axios");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const city = req.query.city;
    const API_KEY = "YOUR_API_KEY";

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;

    const response = await axios.get(url);

    res.json({
      temp: response.data.main.temp,
      weather: response.data.weather[0].main,
      riskMsg: "Weather looks fine ✅"
    });

  } catch {
    res.status(500).json({ error: "Weather fetch failed" });
  }
});

module.exports = router;