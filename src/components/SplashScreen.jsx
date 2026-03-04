import { useState, useEffect } from 'react'
import './SplashScreen.css'

const SplashScreen = ({ onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete();
        }, 3000); // 3 seconds splash duration
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="splash-container">
            <div className="splash-logo-wrapper">
                <div className="loading-squares">
                    <div className="square s1"></div>
                    <div className="square s2"></div>
                    <div className="square s3"></div>
                </div>
                <h1 className="splash-text">Ipschedula</h1>
            </div>
        </div>
    )
}

export default SplashScreen
