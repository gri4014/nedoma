import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GlobalStyles } from './styles/globalStyles';
import ThemeProvider from './providers/ThemeProvider';
import { DashboardLayout } from './components/layout/DashboardLayout';
import LoginForm from './components/auth/LoginForm';
import AdminEventsPage from './pages/AdminEventsPage';
import AdminEventFormPage from './pages/AdminEventFormPage';
import AdminTagsPage from './pages/AdminTagsPage';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/admin/events" replace /> : <LoginForm />
      } />
      <Route path="/admin/*" element={
        isAuthenticated ? (
          <Routes>
            <Route element={<DashboardLayout />}>
              <Route path="events" element={<AdminEventsPage />} />
              <Route path="events/create" element={<AdminEventFormPage />} />
              <Route path="events/edit/:eventId" element={<AdminEventFormPage />} />
              <Route path="tags" element={<AdminTagsPage />} />
            </Route>
          </Routes>
        ) : (
          <Navigate to="/login" replace />
        )
      } />

      {/* Default Route */}
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <GlobalStyles />
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
