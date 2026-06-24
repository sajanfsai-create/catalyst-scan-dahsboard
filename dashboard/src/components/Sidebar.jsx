import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, MonitorSmartphone, Database, Recycle, CalendarDays,
    FileText, PcCase, Users, UserCog, Building2, Bell, Settings, Key,
    Building, Wrench, Download, LogOut, ChevronRight
} from 'lucide-react';

import logocryst from "../assets/logocryst.png";
const navItems = [
    { path: '/', title: 'Overview', icon: LayoutDashboard, role: null },
    { path: '/devices', title: 'Devices', icon: MonitorSmartphone, role: null },
    { path: '/dbexplorer', title: 'DB Explorer', icon: Database, role: 'super_admin' },
    { path: '/ewaste', title: 'E-Waste', icon: Recycle, role: 'not_org_user' },
    { path: '/amc', title: 'AMC Tracker', icon: CalendarDays, role: 'not_org_user' },
    { path: '/reports', title: 'Reports', icon: FileText, role: null },
    { path: '/lab-util', title: 'Lab Utilization', icon: PcCase, role: 'not_org_user' },
    { path: '/partners', title: 'Partners', icon: Users, role: 'super_admin' },
    { path: '/users', title: 'Users', icon: UserCog, role: 'super_admin' },
    { path: '/multi-org', title: 'Multi-Org', icon: Building2, role: 'super_admin' },
    { path: '/alerts', title: 'Alerts', icon: Bell, role: null },
    { path: '/alert-config', title: 'Alert Config', icon: Settings, role: 'super_admin' },
    { path: '/licenses', title: 'Licenses', icon: Key, role: 'super_admin' },
    { path: '/orgs', title: 'Organizations', icon: Building, role: 'super_admin' },
    { path: '/builder', title: 'Build .exe', icon: Wrench, role: 'not_org_user' },
    { path: '/site-settings', title: 'Site Settings', icon: Settings, role: 'super_admin' },
    { path: '/downloads', title: 'Downloads', icon: Download, role: 'partner_only' },
];

const Sidebar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const role = user?.role || 'org_user';
    const [isExpanded, setIsExpanded] = useState(false);

    const canView = (requiredRole) => {
        if (!requiredRole) return true;
        if (requiredRole === 'super_admin' && role === 'super_admin') return true;
        if (requiredRole === 'not_org_user' && !['org_user','end_customer'].includes(role)) return true;
        if (requiredRole === 'partner_only' && role === 'partner') return true;
        if (role === 'super_admin') return true;
        return false;
    };

    return (
        <aside className={`h-screen sticky top-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] z-50 shrink-0 shadow-sm transition-all duration-300 ${isExpanded ? 'w-64' : 'w-20'}`}>
            {/* Logo */}
            <div className="flex items-center justify-between h-16 border-b border-slate-200 dark:border-slate-800 shrink-0 relative px-4">
                <div className={`flex items-center gap-3 ${!isExpanded ? 'justify-center w-full' : ''}`}>
                    <div className="h-10 w-10">
                        <img src={logocryst} alt="CatalystSuite Logo" />
                    </div>

                    {/* <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-emerald-400 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0">
                        C
                    </div>  */}
                    {isExpanded && <span className="font-bold text-lg text-slate-800 dark:text-slate-200 whitespace-nowrap">Catalyst</span>}
                </div>
                {/* Toggle button */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`absolute -right-3 top-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1 text-slate-500 hover:text-blue-500 shadow-sm transition-transform z-50 ${isExpanded ? 'rotate-180' : ''}`}
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 flex flex-col items-center gap-2 overflow-y-auto thin-scrollbar overflow-x-hidden">
                {/* {navItems.filter(item => canView(item.role)).map((item) => { */}
                {navItems.filter(item => canView(item.role)).map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;

                    return (
                        <div key={item.path} className={`group relative flex items-center w-full ${isExpanded ? 'px-4' : 'justify-center px-3'}`}>
                            <NavLink
                                to={item.path}
                                className={`
                                    flex items-center rounded-xl transition-all duration-200
                                    ${isExpanded ? 'w-full px-3 py-3 justify-start gap-3' : 'w-12 h-12 justify-center'}
                                    ${isActive
                                        ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                                        : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                    }
                                `}
                            >
                                <Icon className="w-5 h-5 shrink-0" />
                                {isExpanded && <span className="font-medium whitespace-nowrap">{item.title}</span>}
                            </NavLink>

                            {/* CSS-only Tooltip */}
                            {!isExpanded && (
                                <div className="absolute left-16 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                    <div className="bg-slate-800 text-white text-xs font-medium px-3 py-1.5 rounded-md shadow-xl whitespace-nowrap dark:bg-slate-700">
                                        {item.title}
                                        <div className="absolute w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45 -left-1 top-1/2 -translate-y-1/2"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* Footer Logout */}
            <div className="py-4 flex flex-col items-center border-t border-slate-200 dark:border-slate-800 shrink-0">
                <div className={`group relative flex items-center w-full ${isExpanded ? 'px-4' : 'justify-center px-3'}`}>
                    <button
                        onClick={logout}
                        className={`
                            flex items-center rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200
                            ${isExpanded ? 'w-full px-3 py-3 justify-start gap-3' : 'w-12 h-12 justify-center'}
                        `}
                    >
                        <LogOut className="w-5 h-5 shrink-0" />
                        {isExpanded && <span className="font-medium whitespace-nowrap">Logout</span>}
                    </button>
                    {/* Tooltip */}
                    {!isExpanded && (
                        <div className="absolute left-16 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                            <div className="bg-slate-800 text-white text-xs font-medium px-3 py-1.5 rounded-md shadow-xl whitespace-nowrap dark:bg-slate-700">
                                Logout
                                <div className="absolute w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45 -left-1 top-1/2 -translate-y-1/2"></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
