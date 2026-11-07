import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api, useApi } from '../api.js';

const navLinks = [
  ['Home', '/'],
  ['Games', '/games'],
  ['Players', '/players'],
  ['Teams', '/teams'],
  ['Upload', '/game-data'],
];

export function RequireAuth() {
  const { data, loading } = useApi('/auth/me');
  const location = useLocation();
  if (loading) return null;
  if (!data?.loggedIn) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function Layout() {
  const navigate = useNavigate();

  async function logout() {
    await api.post('/auth/logout');
    navigate('/login');
  }

  return (
    <>
      <nav className="navbar navbar-expand navbar-dark app-navbar sticky-top">
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
            <span className="brand-mark">T</span>
            <span>TMHL <span className="fw-light">Manager</span></span>
          </Link>
          <ul className="navbar-nav me-auto d-none d-md-flex">
            {navLinks.map(([label, to]) => (
              <li key={to} className="nav-item">
                <NavLink className="nav-link" to={to} end={to === '/'}>{label}</NavLink>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-outline-light btn-sm ms-auto" onClick={logout}>Log out</button>
        </div>
      </nav>
      <div className="container">
        <div className="main-content">
          <Outlet />
        </div>
      </div>
    </>
  );
}

export function ErrorAlert({ error }) {
  if (!error) return null;
  return <div className="alert alert-danger">{error.message || String(error)}</div>;
}
