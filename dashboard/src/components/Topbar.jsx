import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Bell, UserCircle, LogOut, Sun, Moon, RefreshCw, Search } from 'lucide-react';

const Topbar = ({ onRefresh }) => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    // Map paths to page titles
    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/') return 'Fleet Overview';
        if (path === '/devices') return 'Device Management';
        if (path === '/alerts') return 'Tamper Alerts';
        if (path === '/licenses') return 'License Management';
        if (path === '/orgs') return 'Organizations';
        if (path === '/builder') return 'Build .exe Package';
        if (path === '/ewaste') return 'E-Waste Compliance';
        if (path === '/amc') return 'AMC Tracker';
        if (path === '/reports') return 'Export Reports';
        if (path === '/lab-util') return 'Lab Utilization';
        if (path === '/multi-org') return 'Multi-Org Hierarchy';
        if (path === '/alert-config') return 'Alert Configurations';
        if (path === '/dbexplorer') return 'Database Explorer';
        if (path === '/partners') return 'Partner Management';
        if (path === '/users') return 'User Management';
        if (path === '/downloads') return 'Downloads';
        if (path === '/site-settings') return 'Site Settings';
        return 'Dashboard';
    };

    return (
        <header className="h-16 px-6 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-40 transition-colors duration-300">
            <div className="flex-1 flex items-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{getPageTitle()}</h2>
            </div>

            {/* <div className="flex-1 flex items-center justify-center max-w-md w-full">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-slate-400 dark:placeholder-slate-500" 
                        placeholder="Search devices, hostnames, organizations..." 
                    />
                </div>
            </div> */}

            <div className="flex-1 flex items-center justify-end gap-3">
                <button
                    onClick={onRefresh}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <RefreshCw size={14} /> <span className="hidden sm:inline">Refresh</span>
                </button>

                <button
                    onClick={toggleTheme}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Toggle Theme"
                >
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>

                <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-700">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{user?.username || 'Admin'}</span>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Online</span>
                        </div>
                    </div>
                    <UserCircle size={32} className="text-slate-400 dark:text-slate-500" />
                </div>
            </div>
        </header>
    );
};

export default Topbar;
