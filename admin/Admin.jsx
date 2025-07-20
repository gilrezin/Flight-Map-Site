import React, { useState, useEffect } from "react";
import AdminDashboard from "./AdminDashboard";
import AdminLogin from "./AdminLogin";

const Admin = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(null);

  useEffect(() => {
    fetch("/api/admin/summary") // protected route
      .then((res) => setIsLoggedIn(res.ok))
      .catch(() => setIsLoggedIn(false));
  }, []);

  if (isLoggedIn === null) return <div>Loading...</div>;

  return isLoggedIn ? (
    <AdminDashboard />
  ) : (
    <AdminLogin onLoginSuccess={() => setIsLoggedIn(true)} />
  );
};

export default Admin;
