import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Login.css';
import './Verification.css';

const Verification = ({ email, onVerificationSuccess }) => {
    const [code, setCode] = useState(['', '', '', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

    useEffect(() => {
        if (inputRefs[0].current) {
            inputRefs[0].current.focus();
        }
    }, []);

    const handleChange = (value, index) => {
        if (isNaN(value)) return;

        const newCode = [...code];
        newCode[index] = value.substring(value.length - 1);
        setCode(newCode);

        if (value && index < 7) {
            inputRefs[index + 1].current.focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs[index - 1].current.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 8).split('');
        if (pastedData.every(char => !isNaN(char))) {
            const newCode = Array(8).fill('');
            pastedData.forEach((char, index) => {
                newCode[index] = char;
            });
            setCode(newCode);
            const lastIndex = Math.min(pastedData.length, 7);
            inputRefs[lastIndex].current.focus();
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        const otp = code.join('');
        if (otp.length !== 8) {
            setError('Please enter the 8-digit code.');
            return;
        }

        setError('');
        setMessage('');
        setLoading(true);

        let { error: verifyError } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'signup',
        });

        if (verifyError) {
            const secondAttempt = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'email',
            });
            verifyError = secondAttempt.error;
        }

        setLoading(false);
        if (verifyError) {
            setError(verifyError.message);
        } else {
            onVerificationSuccess();
        }
    };

    const handleResend = async () => {
        setError('');
        setMessage('');
        setLoading(true);

        const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email: email,
        });

        setLoading(false);
        if (resendError) {
            setError(resendError.message);
        } else {
            setMessage('New code sent to your email!');
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
                <div className="login-card verification-card">
                    <h1 className="login-title">Verify Your Email</h1>
                    <p className="verification-text">
                        We've sent an 8-digit verification code to <br />
                        <strong>{email || 'your email'}</strong>
                    </p>

                    <form className="login-form" onSubmit={handleVerify}>
                        <div className="otp-container">
                            {code.map((data, index) => (
                                <input
                                    key={index}
                                    ref={inputRefs[index]}
                                    className="otp-input"
                                    type="text"
                                    maxLength="1"
                                    value={data}
                                    onChange={e => handleChange(e.target.value, index)}
                                    onKeyDown={e => handleKeyDown(e, index)}
                                    onPaste={handlePaste}
                                    required
                                />
                            ))}
                        </div>

                        {error && <p className="auth-error">{error}</p>}
                        {message && <p className="auth-success">{message}</p>}

                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? 'Checking...' : 'Verify Email'}
                        </button>
                    </form>

                    <div className="signup-link">
                        Didn't receive code? <a href="#" onClick={(e) => { e.preventDefault(); handleResend(); }}>Resend Code</a>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Verification;
