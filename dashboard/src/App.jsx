import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Devices from './pages/Devices';
import Alerts from './pages/Alerts';
import Licenses from './pages/Licenses';
import EWaste from './pages/EWaste';
import AMCTracker from './pages/AMCTracker';
import Reports from './pages/Reports';
import LabUtilization from './pages/LabUtilization';
import Organizations from './pages/Organizations';
import Partners from './pages/Partners';
import Users from './pages/Users';
import MultiOrg from './pages/MultiOrg';
import AlertConfig from './pages/AlertConfig';
import Builder from './pages/Builder';
import SiteSettings from './pages/SiteSettings';
import Downloads from './pages/Downloads';
import DBExplorer from './pages/DBExplorer';
import DeviceVitals from './pages/DeviceVitals';
import Placeholder from './pages/Placeholder';
import './index.css';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;

    return children;
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
                <ProtectedRoute>
                    <Layout />
                </ProtectedRoute>
            }>
                <Route index element={<Overview />} />
                <Route path="devices" element={<Devices />} />
                <Route path="device/:fingerprint/vitals" element={<DeviceVitals />} />
                <Route path="dbexplorer" element={<DBExplorer />} />
                <Route path="ewaste" element={<EWaste />} />
                <Route path="amc" element={<AMCTracker />} />
                <Route path="reports" element={<Reports />} />
                <Route path="lab-util" element={<LabUtilization />} />
                <Route path="partners" element={<Partners />} />
                <Route path="users" element={<Users />} />
                <Route path="multi-org" element={<MultiOrg />} />
                <Route path="alerts" element={<Alerts />} />
                <Route path="alert-config" element={<AlertConfig />} />
                <Route path="licenses" element={<Licenses />} />
                <Route path="orgs" element={<Organizations />} />
                <Route path="builder" element={<Builder />} />
                <Route path="site-settings" element={<SiteSettings />} />
                <Route path="downloads" element={<Downloads />} />

                <Route path="*" element={<Placeholder title="Page Not Found" />} />
            </Route>
        </Routes>
    );
};

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
