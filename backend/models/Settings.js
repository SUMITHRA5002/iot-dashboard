const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  waterLimitEnabled: { type: Boolean, default: false },
  waterLimitValue: { type: Number, default: 90 },
  guestMode: { type: Boolean, default: false },
  nightMode: { type: Boolean, default: true }
});

module.exports = mongoose.model("Settings", settingsSchema);