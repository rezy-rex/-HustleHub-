
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { GigsPage } from './pages/GigsPage';
import { GigDetailPage } from './pages/GigDetailPage';
import { MyGigsPage } from './pages/MyGigsPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { ReceivedBookingsPage } from './pages/ReceivedBookingsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Authenticated Routes (Any role) */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <GigsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/gigs/:id"
                element={
                  <ProtectedRoute>
                    <GigDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Freelancer Only Routes */}
              <Route
                path="/my-gigs"
                element={
                  <ProtectedRoute allowedRoles={['freelancer']}>
                    <MyGigsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/received-bookings"
                element={
                  <ProtectedRoute allowedRoles={['freelancer']}>
                    <ReceivedBookingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Client Only Routes */}
              <Route
                path="/my-bookings"
                element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <MyBookingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
