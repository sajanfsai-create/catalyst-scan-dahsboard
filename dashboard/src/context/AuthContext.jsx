import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchJSON, postJSON } from '../api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Sync localStorage to sessionStorage on load for "Remember Me"
        if (localStorage.getItem('catalyst_auth') && !sessionStorage.getItem('catalyst_auth')) {
            sessionStorage.setItem('catalyst_auth', localStorage.getItem('catalyst_auth'));
        }
        checkSession();
    }, []);

    const checkSession = async () => {
        const auth = sessionStorage.getItem('catalyst_auth');
        if (auth) {
            try {
                const data = JSON.parse(auth);
                if (data.token) {
                    // Quick validation check
                    const stats = await fetchJSON('/api/dashboard/stats');
                    if (stats && stats.error === 401) {
                        logout();
                    } else {
                        setUser(data);
                    }
                }
            } catch (e) {
                sessionStorage.removeItem('catalyst_auth');
            }
        }
        setLoading(false);
    };

    const login = async (username, password, rememberMe) => {
        const res = await postJSON('/api/auth/login', { username, password, remember_me: rememberMe });
        if (res && res.success) {
            const authData = {
                token: res.token,
                username: res.username,
                role: res.role,
                partner_id: res.partner_id || null,
                org_id: res.org_id || null,
                login_time: new Date().toISOString(),
            };
            
            const authString = JSON.stringify(authData);
            sessionStorage.setItem('catalyst_auth', authString);
            
            if (rememberMe) {
                localStorage.setItem('catalyst_auth', authString);
            }
            
            setUser(authData);
            return { success: true };
        } else {
            return { success: false, message: res?.message || 'Invalid credentials' };
        }
    };

    const logout = () => {
        sessionStorage.removeItem('catalyst_auth');
        localStorage.removeItem('catalyst_auth');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
