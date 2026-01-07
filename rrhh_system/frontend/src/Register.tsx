import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
// import './Login.css'; // Reusing some login styles for consistency - REMOVED
import './App.css'; // Assuming App.css has general styles that can be reused
import InputWithIcon from './InputWithIcon'; // Import InputWithIcon component

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Empleado'); // Default role
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const roles = ['Admin', 'RRHH', 'Encargado', 'Empleado'];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await axios.post('http://127.0.0.1:8000/api/register/', {
        username,
        password,
        role,
      });
      setSuccess('User registered successfully! Please log in.');
      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        // Handle specific error messages from the backend
        if (err.response.data.username) {
          setError(err.response.data.username[0]);
        } else if (err.response.data.password) {
          setError(err.response.data.password[0]);
        } else {
          setError('Registration failed. Please try again.');
        }
      } else {
        setError('An unexpected error occurred.');
      }
      console.error('Registration error:', err);
    }
  };

  return (
    <div className="login-container"> {/* Reusing login-container class */}
      <h2>Register New User</h2>
      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}
      <form onSubmit={handleSubmit}>
        <InputWithIcon
          id="username"
          label="Username:"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-user">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          }
        />
        <InputWithIcon
          id="password"
          label="Password:"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-lock">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          }
        />
        <div>
          <label htmlFor="role">Role:</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                boxSizing: 'border-box',
                fontSize: '1em',
                color: 'var(--color-text-dark)',
                backgroundColor: '#fff',
            }}
          >
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <button type="submit">Register</button>
      </form>
      <p>Already have an account? <Link to="/login">Login here</Link></p>
    </div>
  );
};

export default Register;
