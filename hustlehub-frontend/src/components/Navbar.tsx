
import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, role, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <img src="/logo.png" alt="HustleHub+ Logo" className="navbar-logo" />
          <span>HustleHub+</span>
        </Link>

        <div className="navbar-links">
          {isAuthenticated ? (
            <>
              <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Browse Gigs
              </NavLink>

              {role === 'client' && (
                <NavLink to="/my-bookings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  My Bookings
                </NavLink>
              )}

              {role === 'freelancer' && (
                <>
                  <NavLink to="/my-gigs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    My Gigs
                  </NavLink>
                  <NavLink to="/received-bookings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Received Bookings
                  </NavLink>
                </>
              )}

              <div className="user-badge">
                <span>{user?.email || 'User'}</span>
                {role && (
                  <span className={`role-pill role-${role}`}>
                    {role}
                  </span>
                )}
              </div>

              <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem' }}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Login
              </NavLink>
              <NavLink to="/register" className="btn btn-primary" style={{ padding: '0.45rem 1rem' }}>
                Register
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
