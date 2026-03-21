import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import MedicalRecords from './pages/MedicalRecords';
import LabReports from './pages/LabReports';
import Doctors from './pages/Doctors';
import Patients from './pages/Patients';
import Hospitals from './pages/Hospitals';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import AdminUsers from './pages/AdminUsers';
import './index.css';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader"><div className="spinner"/></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <SocketProvider userId={user?._id}>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={!user ? <Login />    : <Navigate to="/" replace />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="appointments"    element={<Appointments />} />
            <Route path="medical-records" element={<MedicalRecords />} />
            <Route path="lab-reports"     element={<LabReports />} />
            <Route path="doctors"         element={<ProtectedRoute roles={['admin','patient']}><Doctors /></ProtectedRoute>} />
            <Route path="patients"        element={<ProtectedRoute roles={['admin','doctor']}><Patients /></ProtectedRoute>} />
            <Route path="hospitals"       element={<ProtectedRoute roles={['admin']}><Hospitals /></ProtectedRoute>} />
            <Route path="chat"            element={<Chat />} />
            <Route path="profile"         element={<Profile />} />
            <Route path="admin/users"     element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
