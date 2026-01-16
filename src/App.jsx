import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

// Theme styles (must be imported before component styles)
import './styles/themes.css';

// Landing Page Components
import LandingNavbar from './components/Navbar/Navbar';
import Hero from './components/Hero/Hero';
import Marquee from './components/Marquee/Marquee';
import Features from './components/Features/Features';
import About from './components/About/About';
import Testimonials from './components/Testimonials/Testimonials';
import Contact from './components/Contact/Contact';
import Footer from './components/Footer/Footer';

// Gmail Scanner App Components
import LandingPage from './pages/LandingPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LoginPage from './pages/LoginPage.jsx';
import LoginCallback from './pages/LoginCallback.jsx';
import SignupPage from './pages/SignupPage.jsx';
import SubscriptionsPage from './pages/SubscriptionsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import BreachCheckPage from './pages/BreachCheckPage.jsx';
import BreachCheckPage from './pages/BreachCheckPage.jsx';
import SurfacePage from './pages/SurfacePage.jsx';
import ActivityLog from './pages/ActivityLog.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminRoute from './components/AdminRoute.jsx';

import './App.css';

// Landing Page Component
const LandingPageComponent = () => {
  return (
    <div className="App">
      <LandingNavbar />
      <Hero />
      <Marquee />
      <Features />
      <About />
      <Testimonials />
      <Contact />
      <Footer />
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return user ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return user ? <Navigate to="/dashboard" /> : children;
};

function AppRoutes() {
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={<LandingPageComponent />}
        />
        <Route
          path="/app"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/login/callback"
          element={<LoginCallback />}
        />
        <Route
          path="/login/2fa"
          element={<TwoFactorPage />}
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscriptions"
          element={
            <ProtectedRoute>
              <SubscriptionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/breach-check"
          element={
            <ProtectedRoute>
              <BreachCheckPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/surface"
          element={
            <ProtectedRoute>
              <SurfacePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

import { NotificationProvider } from './context/NotificationContext.jsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ...

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="App">
            <AppRoutes />
            <ToastContainer
              position="bottom-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="colored"
            />
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
