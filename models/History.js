const mongoose = require("mongoose");

const HistorySchema = new mongoose.Schema({
  name: String,
  income: Number,
  loanAmount: Number,
  emi: Number,
  risk: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("History", HistorySchema);