import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth-context';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggle = () => setMenuOpen((prev) => !prev);
  const close = () => setMenuOpen(false);

  return (
    <nav className={`nav${menuOpen ? ' open' : ''}`}>
      <div className="nav-inner">
        <Link to="/" className="nav-logo" onClick={close}>
          <div className="nav-logo-mark"></div>
          TaskMarket
        </Link>

        <div className="nav-links">
          {user && (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                onClick={close}
              >
                My Dashboard
              </NavLink>
              <NavLink
                to="/messages"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                onClick={close}
              >
                Messages
              </NavLink>
              <NavLink
                to="/profile"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                onClick={close}
              >
                Profile
              </NavLink>
              <NavLink
                to="/reports/my"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                onClick={close}
              >
                My Reports
              </NavLink>
              {user.role === 'admin' && (
                <NavLink
                  to="/admin/reports"
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  onClick={close}
                >
                  Admin
                </NavLink>
              )}
            </>
          )}
        </div>

        <div className={`nav-auth${user ? ' signed-in' : ''}`}>
          {!loading && !user && (
            <>
              <Link to="/login" className="nav-auth-link" onClick={close}>
                Log In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={close}>
                Sign Up
              </Link>
            </>
          )}

          {user && (
            <>
              <span className="nav-greeting">Hi, {user.fullName || 'there'}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => { logout(); close(); }}>
                <LogOut size={16} />
                Log Out
              </button>
            </>
          )}
        </div>

        <button className="nav-toggle" onClick={toggle} aria-label="Toggle menu" aria-expanded={menuOpen}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </nav>
  );
}
