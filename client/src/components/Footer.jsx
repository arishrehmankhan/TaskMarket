import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';

export default function Footer() {
  const { user } = useAuth();

  return (
    <footer className="footer">
      <div className="geo-circle" style={{ position: 'absolute', top: '-60px', right: '-60px', opacity: 0.08 }}></div>
      <div className="container">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="nav-logo-mark"></div>
            <span>TaskMarket</span>
            <p>Get things done. Get paid doing them.</p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h4>Platform</h4>
              <Link to="/">Browse Tasks</Link>
              <Link to="/tasks/new">Post a Task</Link>
              <Link to="/how-it-works">How It Works</Link>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              {user ? (
                <>
                  <Link to="/dashboard">Dashboard</Link>
                  <Link to="/messages">Messages</Link>
                  <Link to="/profile">Profile</Link>
                </>
              ) : (
                <>
                  <Link to="/register">Sign Up</Link>
                  <Link to="/login">Log In</Link>
                  <Link to="/dashboard">Dashboard</Link>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 TaskMarket. Offline payments only &mdash; no fees, no middleman.</p>
        </div>
      </div>
    </footer>
  );
}
