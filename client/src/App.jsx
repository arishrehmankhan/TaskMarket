import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider, { useAuth } from './lib/auth-context';
import Layout from './components/Layout';
import HomePage from './components/HomePage';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import TaskForm from './components/TaskForm';
import TaskDetail from './components/TaskDetail';
import TasksPage from './components/TasksPage';
import ChatPage from './components/ChatPage';
import ProfilePage from './components/ProfilePage';
import ReviewPage from './components/ReviewPage';
import HowItWorksPage from './components/HowItWorksPage';
import MyReportsPage from './components/MyReportsPage';
import AdminReportsPage from './components/AdminReportsPage';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />

            <Route
              path="/login"
              element={
                <GuestOnly>
                  <AuthPage />
                </GuestOnly>
              }
            />
            <Route
              path="/register"
              element={
                <GuestOnly>
                  <AuthPage />
                </GuestOnly>
              }
            />

            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />

            <Route
              path="/tasks/new"
              element={
                <RequireAuth>
                  <TaskForm />
                </RequireAuth>
              }
            />
            <Route path="/tasks" element={<TasksPage />} />
            <Route
              path="/tasks/:taskId/edit"
              element={
                <RequireAuth>
                  <TaskForm />
                </RequireAuth>
              }
            />
            <Route path="/tasks/:taskId" element={<TaskDetail />} />
            <Route
              path="/tasks/:taskId/review"
              element={
                <RequireAuth>
                  <ReviewPage />
                </RequireAuth>
              }
            />

            <Route
              path="/messages"
              element={
                <RequireAuth>
                  <ChatPage />
                </RequireAuth>
              }
            />

            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              }
            />
            <Route
              path="/reports/my"
              element={
                <RequireAuth>
                  <MyReportsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <RequireAdmin>
                  <AdminReportsPage />
                </RequireAdmin>
              }
            />
            <Route path="/users/:userId" element={<ProfilePage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
