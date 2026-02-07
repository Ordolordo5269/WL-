import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../src/contexts/AuthContext';
import { UserPlus, Mail, Lock, User, AlertCircle } from 'lucide-react';
import '../src/styles/auth-forms.css';

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Add auth-page class to body and root for proper overflow
  useEffect(() => {
    document.body.classList.add('auth-page');
    const root = document.getElementById('root');
    if (root) root.classList.add('auth-page');
    
    return () => {
      document.body.classList.remove('auth-page');
      if (root) root.classList.remove('auth-page');
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await register({ name: name || undefined, email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-container bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl mx-auto"
      >
        <div className="glass-card auth-form-card register rounded-2xl">
          <div className="auth-form-header">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="auth-form-icon-container"
            >
              <UserPlus className="w-8 h-8 text-blue-400" />
            </motion.div>
            <h1 className="auth-form-title">Create Account</h1>
            <p className="auth-form-subtitle">Join WorldLore and start exploring</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="auth-error-message"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="auth-error-text">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="auth-form-field">
              <label className="auth-form-label">
                Name (Optional)
              </label>
              <div className="auth-form-input-wrapper">
                <User className="auth-form-icon" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="auth-form-input"
                  placeholder="Your name"
                />
              </div>
            </div>

            <div className="auth-form-field">
              <label className="auth-form-label">
                Email
              </label>
              <div className="auth-form-input-wrapper">
                <Mail className="auth-form-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="auth-form-input"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="auth-form-field">
              <label className="auth-form-label">
                Password
              </label>
              <div className="auth-form-input-wrapper">
                <Lock className="auth-form-icon" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="auth-form-input"
                  placeholder="••••••••"
                />
              </div>
              <p className="auth-form-hint">At least 6 characters</p>
            </div>

            <div className="auth-form-field">
              <label className="auth-form-label">
                Confirm Password
              </label>
              <div className="auth-form-input-wrapper">
                <Lock className="auth-form-icon" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="auth-form-input"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="auth-form-submit"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Sign Up
                </>
              )}
            </motion.button>
          </form>

          <div className="auth-form-link">
            <p className="auth-form-link-text">
              Already have an account?{' '}
              <Link
                to="/login"
                className="auth-form-link-button"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


