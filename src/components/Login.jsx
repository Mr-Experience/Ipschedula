import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Login.css';

const Login = ({ onGoToSignup, onLoginSuccess }) => {
    // Load remembered email from localStorage
    const [email, setEmail] = useState(() => localStorage.getItem('remembered_email') || '');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Save email to localStorage whenever it changes
    useEffect(() => {
        if (email) {
            localStorage.setItem('remembered_email', email);
        }
    }, [email]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        setLoading(false);
        if (error) {
            setError(error.message);
            // Password is reset on error
            setPassword('');
        } else {
            onLoginSuccess();
        }
    };

    return (
        <div className="login-container">
            <header className="login-header">
                <div className="brand-logo">
                    <div className="logo-grid">
                        <div className="sq sq-navy"></div>
                        <div className="sq sq-gray"></div>
                        <div className="sq sq-gray bottom"></div>
                    </div>
                    <span className="brand-name">Ipschedula</span>
                </div>
            </header>

            <main className="login-main">
                <div className="login-card">
                    <h1 className="login-title">Welcome Back to Ipscedula</h1>
                    <form className="login-form" onSubmit={handleLogin}>
                        <div className="form-group">
                            <label htmlFor="email">Email*</label>
                            <input
                                type="email"
                                id="email"
                                className="form-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Password*</label>
                            <input
                                type="password"
                                id="password"
                                className="form-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                            />
                        </div>

                        {error && <p className="auth-error">{error}</p>}

                        <div className="reset-password">
                            <a href="#">Reset Password</a>
                        </div>
                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login to portal'}
                        </button>
                    </form>
                    <div className="signup-link">
                        Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); onGoToSignup(); }}>Sign Up</a>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Login;
