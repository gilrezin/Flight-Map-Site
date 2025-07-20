import React, { useState } from "react";

const AdminLogin = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = async () => {
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || "Login failed");
        return;
      }

      onLoginSuccess();
    } catch {
      setError("Server error");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 20, backgroundColor: "#fff", borderRadius: 4 }}>
      <h2>Admin Login</h2>
      <input
        type="text"
        value={username}
        placeholder="Username"
        onChange={(e) => setUsername(e.target.value)}
        style={{ width: "100%", marginBottom: 10, padding: 8 }}
      />
      <input
        type="password"
        value={password}
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: 10, padding: 8 }}
      />
      {error && <div style={{ color: "red", marginBottom: 10 }}>{error}</div>}
      <button onClick={login} style={{ width: "100%", padding: 10, backgroundColor: "#007bff", color: "#fff", border: "none" }}>
        Log In
      </button>
    </div>
  );
};

export default AdminLogin;
