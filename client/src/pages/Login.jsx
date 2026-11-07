import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/login', { password });
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <nav className="navbar navbar-dark bg-dark">
        <div className="container"><span className="navbar-brand">TMHL Manager</span></div>
      </nav>
      <div className="container" style={{ maxWidth: 400 }}>
        <form className="main-content" onSubmit={submit}>
          <h2 className="mb-3">Administrator Login</h2>
          {error && <div className="alert alert-danger">{error}</div>}
          <input
            type="password"
            className="form-control mb-3"
            placeholder="Password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn btn-lg btn-primary w-100" type="submit">Sign in</button>
        </form>
      </div>
    </>
  );
}
