import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export const RefreshContext = React.createContext();

const Layout = () => {
    // Refresh trigger to allow nested components to react when Topbar refresh is clicked
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-[#020617] overflow-hidden transition-colors duration-300">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Topbar onRefresh={handleRefresh} />
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    <RefreshContext.Provider value={refreshTrigger}>
                        <Outlet />
                    </RefreshContext.Provider>
                </div>
            </main>
        </div>
    );
};

export default Layout;
