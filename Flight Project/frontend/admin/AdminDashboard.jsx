import React, { useEffect, useState } from "react";

const AdminDashboard = () => {
  const [totals, setTotals] = useState({ flights: 0, airports: 0, airlines: 0 });
  const [status, setStatus] = useState("Checking database status...");
  const [airlineName, setAirlineName] = useState("");
  const [jsonFile, setJsonFile] = useState(null);

  const fetchTotals = async () => {
    try {
      const res = await fetch("/api/admin/summary");
      const data = await res.json();
      setStatus("Database is online.");
      setTotals(data);
    } catch (err) {
      setStatus("Database is offline or unreachable.");
    }
  };

  const uploadJSON = async () => {
    if (!jsonFile) return alert("Please choose a JSON file.");

    const formData = new FormData();
    formData.append("file", jsonFile);

    const res = await fetch("/api/admin/uploadFlights", {
      method: "POST",
      body: formData
    });
    const result = await res.json();
    alert(result.message || `Inserted ${result.insertedCount} flights.`);
    fetchTotals();
  };

  const addAirline = async () => {
    if (!airlineName.trim()) return alert("Enter an airline name.");

    const res = await fetch("/api/admin/addAirline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: airlineName })
    });
    const result = await res.json();
    alert(result.message || "Airline added successfully.");
    setAirlineName("");
    fetchTotals();
  };

  const logout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      alert("Logged out successfully.");
      // Redirect or handle UI update here
    } catch (err) {
      alert("Logout failed.");
    }
  };

  useEffect(() => {
    fetchTotals();
  }, []);

  const buttonStyle = {
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    padding: "10px 20px",
    margin: "5px",
    cursor: "pointer",
    borderRadius: "3px"
  };

  const logoutButtonStyle = {
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    padding: "8px 16px",
    fontSize: "14px",
    position: "absolute",
    right: 20,
    top: 20,
    borderRadius: "3px",
    cursor: "pointer"
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", margin: 20, backgroundColor: "#f5f5f5" }}>
      <div style={{ backgroundColor: "#333", color: "white", padding: 15, textAlign: "center", position: "relative" }}>
        <h1>Flight Map Admin Dashboard</h1>
        <button onClick={logout} style={logoutButtonStyle}>Logout</button>
      </div>

      <div style={{ maxWidth: 800, margin: "20px auto", backgroundColor: "white", padding: 20, borderRadius: 5 }}>
        {/* Summary Section */}
        <div style={{ border: "1px solid #ddd", padding: 15, marginBottom: 30 }}>
          <h2 style={{ color: "#333", borderBottom: "2px solid #007bff", paddingBottom: 5 }}>Database Summary</h2>
          <div style={{ backgroundColor: "#d4edda", border: "1px solid #c3e6cb", color: "#155724", padding: 10, borderRadius: 3 }}>{status}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p>Total Flights: {totals.flights}</p>
              <p>Total Airports: {totals.airports}</p>
              <p>Total Airlines: {totals.airlines}</p>
            </div>
            <button onClick={fetchTotals} style={buttonStyle}>Refresh</button>
          </div>
        </div>

        {/* Upload Flights */}
        <div style={{ border: "1px solid #ddd", padding: 15, marginBottom: 30 }}>
          <h2 style={{ color: "#333", borderBottom: "2px solid #007bff", paddingBottom: 5 }}>Upload Flight Data (JSON)</h2>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <input type="file" accept="application/json" onChange={(e) => setJsonFile(e.target.files[0])} />
            <button onClick={uploadJSON} style={buttonStyle}>Upload</button>
          </div>
        </div>

        {/* Add Airline */}
        <div style={{ border: "1px solid #ddd", padding: 15 }}>
          <h2 style={{ color: "#333", borderBottom: "2px solid #007bff", paddingBottom: 5 }}>Add New Airline</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              type="text"
              value={airlineName}
              onChange={(e) => setAirlineName(e.target.value)}
              placeholder="Airline Name"
              style={{ flex: 1, padding: 8 }}
            />
            <button onClick={addAirline} style={buttonStyle}>Add Airline</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
