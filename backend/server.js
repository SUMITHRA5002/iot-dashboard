const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Settings = require("./models/Settings");
const Water = require("./models/Water");
const Alert = require("./models/Alert");
const app = express();
app.use(cors());
app.use(express.json());
mongoose.connect("mongodb+srv://sumithratcse2024_db_user:iesEcWNXuj2y59kb@cluster0.jl6tvlz.mongodb.net/smartwater")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// ------------------------------
// Water Data Object (Dynamic)
// ------------------------------
let waterData = {
  level: 0,
  flowRate: 0,
  leakage: false,
  motor: false
};

// ------------------------------
// Usage History (for graph)
// ------------------------------
let usageHistory = [
  { time: "12 AM", value: 40 },
  { time: "4 AM", value: 30 },
  { time: "8 AM", value: 70 },
  { time: "12 PM", value: 120 },
  { time: "4 PM", value: 90 },
  { time: "8 PM", value: 110 }
];

// ------------------------------
// Leakage Detection Variables
// ------------------------------
let previousLevel = null;
let previousTime = null;
let leakStartTime = null;

// System Control Variables
let levelLimitEnabled = false;
let levelLimitValue = 90;

let guestMode = false;
let nightMode = true;

// ------------------------------
// Root Route
// ------------------------------
app.get("/", (req, res) => {
  res.send("Smart Water Backend Running");
});

// ------------------------------
// Get Current Status
// ------------------------------
app.get("/api/status", (req, res) => {
  res.json({
    ...waterData,
    usage: usageHistory
  });
});

// ------------------------------
// Update Data from NodeMCU
// ------------------------------
app.post("/api/update", async (req, res) => {

  console.log("Data received from ESP:", req.body);

  const currentLevel = req.body.level;

// Apply Level Limit
if (levelLimitEnabled && currentLevel >= levelLimitValue) {
  waterData.motor = false;

  await Alert.create({
    type: "Limit",
    message: "Motor stopped due to level limit"
  });
}

  

  const currentHour = new Date().getHours(); // 0–23

  let leakage = false;

  // Night time condition (11 PM – 5 AM)
  const isNight = nightMode && (currentHour >= 23 || currentHour < 5);

  // Check decreasing level during night and motor OFF
  if (previousLevel !== null && currentLevel < previousLevel && !waterData.motor && isNight && !guestMode) {

    if (!leakStartTime) {
      leakStartTime = Date.now();
    }

    const duration = (Date.now() - leakStartTime) / 1000; // seconds

    // 100 minutes = 6000 seconds
    if (duration > 6000) {
      leakage = true;
    }

  } else {
    // Reset timer if condition breaks
    leakStartTime = null;
  }

  waterData = {
    ...waterData,
    level: currentLevel,
    leakage: leakage
  };

  previousLevel = currentLevel;
  previosTime = Date.now();

  const newEntry = new Water({
  level: currentLevel,
  motor: waterData.motor,
  leakage: leakage
});

await newEntry.save();

  res.json({ message: "Updated", waterData });
});

// ------------------------------
// Motor Control Route
// ------------------------------
app.post("/api/motor", async (req, res) => {
  waterData.motor = req.body.motor;

  await Alert.create({
    type: "Motor",
    message: waterData.motor
      ? "Motor turned ON"
      : "Motor turned OFF"
  });

  res.json({ message: "Motor updated", waterData });
});

// Flow Rate API
app.get("/api/flowrate", async (req, res) => {
  const lastTwo = await Water.find()
    .sort({ timestamp: -1 })
    .limit(2);

  if (lastTwo.length < 2) {
    return res.json({ flowRate: 0 });
  }

  const levelDiff = lastTwo[1].level - lastTwo[0].level;

  const timeDiff =
    (lastTwo[0].timestamp - lastTwo[1].timestamp) / 1000;

  const flowRate = timeDiff > 0 ? levelDiff / timeDiff : 0;

  res.json({ flowRate });
});

// History API
app.get("/api/history", async (req, res) => {
  const history = await Water.find()
    .sort({ timestamp: -1 })
    .limit(50);

  res.json(history.reverse());
});

// Alerts API
app.get("/api/alerts", async (req, res) => {
  const alerts = await Alert.find()
    .sort({ timestamp: -1 })
    .limit(20);

  res.json(alerts);
});

// Level Limit Control
app.post("/api/limit", (req, res) => {
  levelLimitEnabled = req.body.enabled;
  levelLimitValue = req.body.value || 90;

  res.json({ message: "Limit updated" });
});

// Guest Mode
app.post("/api/guest", (req, res) => {
  guestMode = req.body.enabled;
  res.json({ message: "Guest mode updated" });
});

// Night Mode
app.post("/api/night", (req, res) => {
  nightMode = req.body.enabled;
  res.json({ message: "Night mode updated" });
});

app.get("/api/settings", async (req, res) => {
  try {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({});
    }

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "Failed to get settings" });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const { waterLimitEnabled, waterLimitValue, guestMode, nightMode } = req.body;

    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({});
    }

    settings.waterLimitEnabled = waterLimitEnabled;
    settings.waterLimitValue = waterLimitValue;
    settings.guestMode = guestMode;
    settings.nightMode = nightMode;

    await settings.save();

    res.json({ message: "Settings updated", settings });
  } catch (error) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// ------------------------------
// Start Server
// ------------------------------
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});