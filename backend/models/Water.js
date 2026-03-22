const mongoose = require("mongoose");

const waterSchema = new mongoose.Schema({
  level: Number,
  motor: Boolean,
  leakage: Boolean,
  flowRate: Number,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Water", waterSchema);