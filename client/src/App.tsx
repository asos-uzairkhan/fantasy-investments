import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import InitialSelection from './pages/InitialSelection';
import AdminPanel from './pages/AdminPanel';
import { getCurrentUser } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [needsInitialSelection, setNeedsInitialSelection] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await getCurrentUser();
        setIsAuthenticated(true);
        setNeedsInitialSelection(response.data.needsInitialSelection);
        setIsAdmin(response.data.is_admin);
      } catch (error) {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      }
    }
    setLoading(false);
  };

  const handleLogin = (needsSelection: boolean, admin: boolean) => {
    setIsAuthenticated(true);
    setNeedsInitialSelection(needsSelection);
    setIsAdmin(admin);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setNeedsInitialSelection(false);
    setIsAdmin(false);
  };

  const handleSelectionComplete = () => {
    setNeedsInitialSelection(false);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <Login onLogin={handleLogin} />
            ) : needsInitialSelection ? (
              <Navigate to="/initial-selection" />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />
        <Route
          path="/register"
          element={
            !isAuthenticated ? (
              <Register onRegister={handleLogin} />
            ) : needsInitialSelection ? (
              <Navigate to="/initial-selection" />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />
        <Route
          path="/initial-selection"
          element={
            isAuthenticated && needsInitialSelection ? (
              <InitialSelection onComplete={handleSelectionComplete} />
            ) : isAuthenticated ? (
              <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated && !needsInitialSelection ? (
              <Dashboard onLogout={handleLogout} isAdmin={isAdmin} />
            ) : isAuthenticated ? (
              <Navigate to="/initial-selection" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/admin"
          element={
            isAuthenticated && isAdmin ? (
              <AdminPanel onLogout={handleLogout} />
            ) : isAuthenticated ? (
              <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
