const express = require("express");
const auth = require("../middleware/auth");
const History = require("../models/History");

const router = express.Router();

router.post("/", auth, async (req, res) => {
  try {
    const { income, loanAmount, interest, duration, name } = req.body;

    const P = Number(loanAmount);
    const N = Number(duration);
    const userIncome = Number(income);

    if (
      isNaN(P) ||
      isNaN(interest) ||
      isNaN(N) ||
      isNaN(userIncome)
    ) {
      return res.status(400).json({ error: "Invalid inputs" });
    }

    const { calculateEMI } = require("../shared/emiCalculator");

    const emi = calculateEMI(P, interest, N);

    const totalPayment = emi * N;
    const interestCost = totalPayment - P;

    const dti = (emi / userIncome) * 100;

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
  risk,
  dti: Number(dti.toFixed(2))
});

    res.json({
      emi: Number(emi.toFixed(2)),
      totalPayment: Number(totalPayment.toFixed(2)),
      interestCost: Number(interestCost.toFixed(2)),
      risk,
      advice,
      dti: Number(dti.toFixed(2))
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});