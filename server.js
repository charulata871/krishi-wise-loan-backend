require("dotenv").config({ path: "./.env" });
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

const corsOptions = {
  origin: [
    "http://localhost:8080",
    "http://localhost:5173",
    "https://krishi-wise-loan-enb8.vercel.app"
  ],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// ✅ MODELS
const User = require("./models/User");
const History = require("./models/History");
const Scheme = require("./models/Scheme");

const SECRET = "krishi_secret";

/* ───────── AUTH ───────── */

// REGISTER


// LOGIN (ONLY ONE VERSION)

app.post("/api/login", async (req, res) => {
  const { name, password } = req.body;

  console.log("LOGIN BODY:", name, password);

  const user = await User.findOne({ name });
  console.log("USER FROM DB:", user);

  // ✅ FIRST CHECK USER
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  console.log("✅ LOGIN SUCCESS");

  const token = jwt.sign(
    { id: user._id, name: user.name },
    SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token, user });
});
// ✅ REGISTER ROUTE


app.post("/api/register", async (req, res) => {
  try {
    const { name, password } = req.body;

    const existingUser = await User.findOne({ name });
    if (existingUser) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // 🔥 HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      password: hashedPassword
    });

    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, name: newUser.name },
      SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/schemes", async (req, res) => {
   console.log("🔥 SCHEMES HIT");
  console.log("BODY:", req.body);
  try {
    console.log("REQ BODY:", req.body); // 👈 ADD THIS

    const { crop, state } = req.body;

    const schemes = await Scheme.find({
  $and: [
    {
      $or: [
        { crop: { $regex: new RegExp(`^${crop}$`, "i") } },
        { crop: { $regex: /^all$/i } }
      ]
    },
    {
      $or: [
        { state: { $regex: new RegExp(`^${state}$`, "i") } },
        { state: { $regex: /^india$/i } }
      ]
    }
  ]
});

    console.log("FOUND SCHEMES:", schemes); // 👈 ADD THIS

    res.json({ schemes });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});
/* ───────── ANALYZE ───────── */
app.post("/api/analyze", async (req, res) => {
  try {
    const { name, income, loanAmt, rate, months } = req.body;

    const P = parseFloat(loanAmt);
    const N = parseInt(months);
    const userIncome = parseFloat(income);

    if (isNaN(P) || isNaN(rate) || isNaN(N) || isNaN(userIncome)) {
      return res.status(400).json({ error: "Invalid inputs" });
    }

    if (P <= 0 || N <= 0 || userIncome <= 0) {
      return res.status(400).json({ error: "Values must be positive" });
    }

    const R = parseFloat(rate) / 12 / 100;

if (isNaN(R)) {
  return res.status(400).json({ error: "Invalid interest rate" });
}



let emi;

if (Number(rate) === 0) {
  emi = P / N;
} else {
  const denominator = Math.pow(1 + R, N) - 1;

  emi =
    denominator === 0
      ? P / N
      : (P * R * Math.pow(1 + R, N)) / denominator;
}

const totalPayment = emi * N;
const interestCost = totalPayment - P;

const dti = userIncome > 0 ? (emi / userIncome) * 100 : 0;

let risk = "";
let advice = [];

    if (dti <= 40) {
      risk = "Low";
      advice.push("✅ EMI manageable");
    } else if (dti <= 70) {
      risk = "Medium";
      advice.push("⚠️ Be cautious");
    } else {
      risk = "High";
      advice.push("❌ Too risky");
    }

    if (dti > 100) {
      advice.unshift("⚠️ Extremely high risk");
    }

    await History.create({
  name,
  income: userIncome,
  loanAmount: P,
  emi: Number(emi.toFixed(2)),
  totalPayment: Number(totalPayment.toFixed(2)),
  interestCost: Number(interestCost.toFixed(2)),
  risk
});

    res.json({
  emi: Number(emi.toFixed(2)),
  totalPayment: Number(totalPayment.toFixed(2)),
  interestCost: Number(interestCost.toFixed(2)),
  riskScore: Number(dti.toFixed(2)),
  risk,
  advice
});

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analyze failed" });
  }
});

/* ───────── HISTORY ───────── */

app.get("/api/history/:name", async (req, res) => {
  try {
    const data = await History.find({ name: req.params.name }).sort({ _id: -1 });
    res.json(data);
  } catch {
    res.status(500).json({ error: "History failed" });
  }
});

/* ───────── WEATHER ───────── */

app.get("/api/weather", async (req, res) => {
  try {
    const { city, lat, lon } = req.query;

    const API_KEY = "59b4aa458f30c3b11b3c91d2c109ad48";

    let url;

    if (lat && lon) {
      // ✅ location based
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    } else {
      // ✅ fallback city
      url = `https://api.openweathermap.org/data/2.5/weather?q=${city || "Delhi"}&appid=${API_KEY}&units=metric`;
    }

    const response = await axios.get(url);

    res.json({
      temp: response.data.main.temp,
      weather: response.data.weather[0].main,
      riskMsg: "Weather looks fine ✅",
    });

  } catch (err) {
    console.error("Weather error:", err.message);
    res.status(500).json({ error: "Weather fetch failed" });
  }
});
/* ───────── ROOT ───────── */

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});


// ✅ Auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ✅ Protected route
app.get("/api/protected", auth, (req, res) => {
  res.json({
    message: "You are authorized ✅",
    user: req.user
  });
});

/* ───────── START SERVER ───────── */
const PORT = process.env.PORT || 5000;
console.log("ENV CHECK:", process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected ✅");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} 🚀`);
    });

  })
  .catch(err => {
    console.log("MongoDB Error ❌", err);
  });