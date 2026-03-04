import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import './Login.css';
import './Signup.css';

const Signup = ({ onGoToLogin, onSignupSuccess }) => {
    const [joinTeam, setJoinTeam] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        fullName: '',
        nickname: '',
        email: '',
        phone: '',
        password: '',
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.id]: e.target.value });
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { data, error: signUpError } = await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: {
                data: {
                    full_name: form.fullName,
                    nickname: form.nickname,
                    phone: form.phone,
                    join_team: joinTeam,
                },
            },
        });

        setLoading(false);
        if (signUpError) {
            setError(signUpError.message);
            // Clear password on error
            setForm({ ...form, password: '' });
        } else {
            onSignupSuccess(form.email);
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
                <div className="signup-card">
                    <h1 className="login-title">Create an Account</h1>
                    <form className="login-form" onSubmit={handleSignup}>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="fullName">Full Name*</label>
                                <input type="text" id="fullName" className="form-input" value={form.fullName} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="nickname">Nickname*</label>
                                <input type="text" id="nickname" className="form-input" value={form.nickname} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="email">Email*</label>
                                <input type="email" id="email" className="form-input" value={form.email} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone">Phone Number*</label>
                                <input type="tel" id="phone" className="form-input" value={form.phone} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password*</label>
                            <input type="password" id="password" className="form-input" value={form.password} onChange={handleChange} autoComplete="new-password" required />
                        </div>

                        {error && <p className="auth-error">{error}</p>}

                        <div className="checkbox-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={joinTeam}
                                    onChange={() => setJoinTeam(!joinTeam)}
                                    className="checkbox-input"
                                />
                                <span>Join <strong>ipexpressdevteam</strong></span>
                            </label>
                        </div>

                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? 'Creating account...' : 'Sign Up'}
                        </button>
                    </form>

                    <div className="signup-link">
                        Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); onGoToLogin(); }}>Go back to Login</a>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Signup;
