import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import AutoOrders from './components/AutoOrders';
import Analytics from './components/Analytics';
import MLPredictions from './components/MLPredictions';
import { api } from './lib/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAuthenticated(false);
      return;
    }
    // Проверяем токен на бэкенде
    api.get('/auth/me')
      .then(() => setIsAuthenticated(true))
      .catch(() => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      });
  }, []);

  if (isAuthenticated === null) return <div>Загрузка...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login onLogin={() => setIsAuthenticated(true)} /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/inventory" element={isAuthenticated ? <Inventory /> : <Navigate to="/login" />} />
        <Route path="/auto-orders" element={isAuthenticated ? <AutoOrders /> : <Navigate to="/login" />} />
        <Route path="/analytics" element={isAuthenticated ? <Analytics /> : <Navigate to="/login" />} />
        <Route path="/ml-predictions" element={isAuthenticated ? <MLPredictions /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;