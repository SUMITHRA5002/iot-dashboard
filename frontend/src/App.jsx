import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "./App.css";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

function App() {
  const backend = "http://localhost:5000";

  const [data, setData] = useState({});
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [flowRate, setFlowRate] = useState(0);

  const [settings, setSettings] = useState({
  waterLimitEnabled: false,
  waterLimitValue: 90,
  guestMode: false,
  nightMode: true
});

const updateSettings = (updatedSettings) => {
  fetch("http://localhost:5000/api/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(updatedSettings)
  })
    .then(res => res.json())
    .then(data => {
      setSettings(data.settings);
    })
    .catch(err => console.error(err));
};

  const fetchStatus = async () => {
  const status = await fetch(`${backend}/api/status`);
  setData(await status.json());

  const flow = await fetch(`${backend}/api/flowrate`);
  const flowData = await flow.json();
  setFlowRate(flowData.flowRate);

  const alertData = await fetch(`${backend}/api/alerts`);
  setAlerts(await alertData.json());
};

const fetchHistory = async () => {
  const hist = await fetch(`${backend}/api/history`);
  setHistory(await hist.json());
};

  useEffect(() => {
  fetchStatus(); // run immediately

  const interval = setInterval(() => {
    fetchStatus();
  }, 3000); // every 3 seconds

  return () => clearInterval(interval);
}, []);

useEffect(() => {
  fetchHistory(); // load only once
}, []);

  useEffect(() => {
  fetch("http://localhost:5000/api/settings")
    .then(res => res.json())
    .then(data => setSettings(data))
    .catch(err => console.error(err));
}, []);

  const chartData = {
    labels: history.map((h) =>
      new Date(h.timestamp).toLocaleTimeString()
    ),
    datasets: [
      {
        label: "Water Level (%)",
        data: history.map((h) => h.level),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.2)",
        tension: 0.4,
      },
    ],
  };

const toggleMotor = async () => {
  await fetch(`${backend}/api/motor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ motor: !data.motor }),
  });

  fetchStatus(); // refresh status after toggle
};

const toggleGuestMode = async () => {
  await fetch("http://localhost:5000/api/guest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      enable: !settings.guestMode
    })
  });

  setSettings({
    ...settings,
    guestMode: !settings.guestMode
  });
};

const toggleNightMode = async () => {
  await fetch("http://localhost:5000/api/night", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      enable: !settings.nightMode
    })
  });

  setSettings({
    ...settings,
    nightMode: !settings.nightMode
  });
};

  return (
    <div className="dashboard">

      <div className="title">
        <h1>Smart Water Monitoring</h1>
        <p>IoT-based Water Level & Usage Dashboard</p>
      </div>

      {/* ROW 1 */}
      <div className="card hero-card">
        <div className="hero-left">
          <h2>Water Level Status</h2>
          <div className="hero-value">{data.level}%</div>
          <p>Current tank level</p>
        </div>

        <div className="hero-right">
          <div className="progress-container">
            <div
              className="progress-bar"
              style={{ width: `${data.level || 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* ROW 2 */}
      <div className="row-2">
        <div className="card graph-card">
          <h2>Water Usage Trend</h2>
          <Line data={chartData} />
        </div>

        <div className="card alert-card">
          <h2>Alert Logs</h2>
          {alerts.length === 0 ? (
            <p className="success">System operating normally</p>
          ) : (
            alerts.map((a) => (
              <p key={a._id} className="danger">
                [{new
                Date(a.timestamp).toLocaleTimeString()}]
                {a.type} - {a.message}
              </p>
            ))
          )}
        </div>
      </div>

      {/* ROW 3 */}
      <div className="card small-card">
  <h3>Water Level Limit</h3>

  {/* Toggle Switch */}
  <label className="switch">
    <input
      type="checkbox"
      checked={settings.waterLimitEnabled}
      onChange={(e) =>
        updateSettings({
          ...settings,
          waterLimitEnabled: e.target.checked
        })
      }
    />
    <span className="slider"></span>
  </label>

  {/* Show Slider Only If Enabled */}
  {settings.waterLimitEnabled && (
    <div className="limit-slider">
      <input
        type="range"
        min="0"
        max="100"
        value={settings.waterLimitValue}
        onChange={(e) =>
          updateSettings({
            ...settings,
            waterLimitValue: Number(e.target.value)
          })
        }
      />
      <p>{settings.waterLimitValue}%</p>
    </div>
  )}

        <div className="card small-card">
          <h3>Flow Rate</h3>
          <p>{flowRate?.toFixed(2)} L/min</p>
        </div>

        <div className="card small-card">
          <h3>Leakage Status</h3>
          <p className={data.leakage ? "danger" : "success"}>
            {data.leakage ? "Leak Detected" : "No Leakage"}
          </p>
        </div>
      </div>

      {/* ROW 4 */}
      <div className="row-3">
        
        <div className="card small-card">
  <h3>Guest Mode</h3>

  <label className="switch">
    <input
      type="checkbox"
      checked={settings.guestMode}
      onChange={toggleGuestMode}
    />
    <span className="slider"></span>
  </label>

  <p>{settings.guestMode ? "Enabled" : "Disabled"}</p>
</div>

        <div className="card small-card">
  <h3>Night Monitoring</h3>

  <label className="switch">
    <input
      type="checkbox"
      checked={settings.nightMode}
      onChange={toggleNightMode}
    />
    <span className="slider"></span>
  </label>

  <p>
    {settings.nightMode
      ? "Active (11 PM - 5 AM)"
      : "Inactive"}
  </p>
</div>

        <div className="card small-card">
  <h3>Motor Status</h3>

  <label className="switch">
    <input
      type="checkbox"
      checked={data.motor}
      onChange={toggleMotor}
    />
    <span className="slider"></span>
  </label>

  <p>{data.motor ? "Running" : "Stopped"}</p>
</div>
      </div>

    </div>
  );
}

export default App;