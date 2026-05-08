const mongoose = require("mongoose");

const schemeSchema = new mongoose.Schema({
  name: String,
  crop: String,
  state: String,
  benefit: String,
  eligibility: String,
  link:String
});

module.exports = mongoose.model("Scheme", schemeSchema);