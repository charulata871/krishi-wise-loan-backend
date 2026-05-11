require("dotenv").config({ path: "./.env" });
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors({
  origin: [
    "http://localhost:5173",
    /\.vercel\.app$/
  ],
  credentials: true
}));



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
  try {
    const { name, password } = req.body || {}; // 🔥 SAFE

    console.log("LOGIN BODY:", name, password);

    if (!name || !password) {
      return res.status(400).json({ error: "Name and password required" });
    }

    const user = await User.findOne({ name });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, name: user.name },
      SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, user });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// ✅ REGISTER ROUTE


app.post("/api/register", async (req, res) => {
  try {
    const { name, password } = req.body || {};

    if (!name || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const existingUser = await User.findOne({ name });

    if (existingUser) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      password: hashedPassword,
    });

    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, name: newUser.name },
      SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });

  } catch (err) {
  console.log("BACKEND ERROR:", err.response?.data);
  console.log("FULL ERROR:", err);

  alert("Registration failed");
}
});
app.post("/api/schemes", async (req, res) => {
  console.log("🔥 SCHEMES HIT");
  console.log("BODY:", req.body);

  try {
    const schemes = [
  {
    name: "PM Kisan Yojana",
    crop: "rice",
    state: "Bihar",
    link: "https://pmkisan.gov.in/"
  },
  {
    name: "KCC Loan",
    crop: "all",
    state: "India",
    link: "https://www.nabard.org/content1.aspx?id=23"
  }
];

    console.log("FOUND SCHEMES:", schemes);

    res.json({ schemes });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: "Server error"
    });
  }
});
/* ───────── ANALYZE ───────── */
app.post("/api/analyze", async (req, res) => {
  try {
    const { name, income, loanAmt, rate, months } = req.body;

    const P = Number(loanAmt);
const N = Number(months);
const userIncome = Number(income);
const interestRate = Number(rate);

if (!P || !N || !userIncome || isNaN(interestRate)) {
  return res.status(400).json({ error: "Invalid inputs" });
}

const R = interestRate / 12 / 100;

if (isNaN(R)) {
  return res.status(400).json({ error: "Invalid interest rate" });
}



let emi;

if (interestRate === 0) {
  emi = P / N;
} else {
  const pow = Math.pow(1 + R, N);
  emi = (P * R * pow) / (pow - 1);
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