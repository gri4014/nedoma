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
import WelcomePage from './pages/WelcomePage';
import BubblesPage from './pages/BubblesPage';
import TagSelectionPage from './pages/TagSelectionPage';
import SettingsPage from './pages/SettingsPage';
import { EventsPage } from './pages/EventsPage';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/admin/events" replace /> : <LoginForm />
      } />
      {/* Admin Routes */}
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

      {/* User Routes */}
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/bubbles" element={<BubblesPage />} />
      <Route path="/tags" element={<TagSelectionPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/settings" element={<SettingsPage />} />

      {/* Default Route - go to bubbles if authenticated, otherwise welcome */}
      <Route path="/" element={
        isAuthenticated ? <Navigate to="/events" replace /> : <Navigate to="/welcome" replace />
      } />
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
