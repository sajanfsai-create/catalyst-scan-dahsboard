function escapeHTML(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

// Sync localStorage to sessionStorage on page load for "Remember Me"
if (localStorage.getItem('catalyst_auth') && !sessionStorage.getItem('catalyst_auth')) {
    sessionStorage.setItem('catalyst_auth', localStorage.getItem('catalyst_auth'));
}

// Global state
let currentView = 'overview';
let _isRefreshing = false;
let _appVersion = 'v2.2';
let _globalOrgFilter = null;  // Global org filter for admins/partners
let _globalPartnerFilter = null; // Global partner filter for super_admin

// ── Dark Mode ──
function toggleDarkMode() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('catalyst_theme', isDark ? 'light' : 'dark');
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = isDark ? '<iconify-icon icon="lucide:moon"></iconify-icon>' : '<iconify-icon icon="lucide:sun"></iconify-icon>';
}

// Restore theme on load
(function () {
    const saved = localStorage.getItem('catalyst_theme');
    if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        setTimeout(function () {
            var btn = document.getElementById('theme-toggle-btn');
            if (btn) btn.textContent = '<iconify-icon icon="lucide:sun"></iconify-icon>';
        }, 0);
    }
})();

// ── Mobile Menu ──
function toggleMobileMenu() {
    var sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

// ── Toast Notifications ──
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '<iconify-icon icon="lucide:check-circle"></iconify-icon>' : type === 'error' ? '<iconify-icon icon="lucide:x-circle"></iconify-icon>' : '<iconify-icon icon="lucide:info"></iconify-icon>';
    toast.innerHTML = `<span>${icon}</span><span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
// -- Role-based sidebar visibility --
function applyRoleBasedUI() {
    var token = sessionStorage.getItem('session_token');
    if (!token) return;
    try {
        // Decode Fernet token or legacy HMAC
        var role = 'super_admin'; // default
        if (token.includes('.')) {
            // Legacy HMAC: base64.signature
            var b64 = token.split('.')[0];
            var payload = atob(b64);
            var parts = payload.split('|');
            role = parts.length >= 2 ? parts[1] : 'super_admin';
        }
        // Store role for reference
        sessionStorage.setItem('user_role', role);

        // Hide admin-only items for org_user
        var adminOnlyNavIds = ['nav-partners', 'nav-users', 'nav-db-explorer', 'nav-build-exe', 'nav-site-settings'];
        var partnerOnlyNavIds = ['nav-partners', 'nav-users', 'nav-db-explorer', 'nav-site-settings'];

        if (role === 'org_user') {
            adminOnlyNavIds.forEach(function (id) {
                var el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            // Also hide the ADMINISTRATION section header
            document.querySelectorAll('.nav-section-title').forEach(function (el) {
                if (el.textContent.trim() === 'ADMINISTRATION') el.style.display = 'none';
            });
        } else if (role === 'partner') {
            partnerOnlyNavIds.forEach(function (id) {
                var el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
        }
    } catch (e) {
        console.log('Role check skipped:', e);
    }
}


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Bostontech CatalystScan Dashboard  -  App JS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const API = '';  // Same origin


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AUTH: Login / Logout / Session
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

async function doLogin() {
    const user = document.getElementById('login-user').value.trim() || "TekkiX Admin";
    const errorEl = document.getElementById('login-error');

    const authData = JSON.stringify({
        token: "dummy_preview_token",
        username: user,
        role: "super_admin",
        partner_id: null,
        org_id: null,
        login_time: new Date().toISOString(),
    });
    sessionStorage.setItem('catalyst_auth', authData);

    showApp(user, 'super_admin');
    loadOverview();  // Load dashboard data immediately after login
}

function doLogout() {
    sessionStorage.removeItem('catalyst_auth');
    localStorage.removeItem('catalyst_auth');
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-layout').style.display = 'none';
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
    document.getElementById('login-error').style.display = 'none';
}

function showForgotPassword() {
    const errorEl = document.getElementById('login-error');
    errorEl.innerHTML = `
        <div style="color:var(--text-primary);background:var(--bg-hover);border:1px solid var(--border);border-radius:8px;padding:16px;text-align:left;font-size:13px;">
            <strong style="font-size:14px;"><iconify-icon icon="lucide:key"></iconify-icon> Password Reset</strong><br><br>
            Please contact your system administrator to reset your password.<br><br>
            <strong>Admin Contact:</strong><br>
            <iconify-icon icon="lucide:mail"></iconify-icon> <a href="mailto:support@bostontechindia.com" style="color:var(--primary);">support@bostontechindia.com</a><br>
            <iconify-icon icon="lucide:phone"></iconify-icon> +91-XXXX-XXXXXX<br><br>
            <small style="color:var(--text-muted);">Admins can reset passwords from Dashboard → Users → <iconify-icon icon="lucide:key"></iconify-icon> Reset Password</small>
        </div>
    `;
    errorEl.style.display = 'block';
    errorEl.style.color = 'inherit';
}

function showApp(username, role) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-layout').style.display = 'grid';
    document.getElementById('admin-user-label').innerText = username || 'Admin';

    // Show role badge
    const roleBadge = document.getElementById('admin-role-badge');
    if (roleBadge && role) {
        const labels = { super_admin: 'Super Admin', partner: 'Partner', org_user: 'Org User', end_customer: 'End Customer', education_hod: 'Education HOD', education_it_head: 'Education IT Head', education_dean: 'Education Dean', education_vc: 'Education VC' };
        const roleColors = { super_admin: '#6366f1', partner: '#10b981', org_user: '#f59e0b', end_customer: '#06b6d4', education_hod: '#8b5cf6', education_it_head: '#8b5cf6', education_dean: '#8b5cf6', education_vc: '#8b5cf6' };
        roleBadge.innerText = labels[role] || role;
        roleBadge.style.background = roleColors[role] || '#64748b';
        roleBadge.style.color = '#ffffff';
    }

    // Role-based sidebar visibility
    applyRoleVisibility(role || 'super_admin');
}

function applyRoleVisibility(role) {
    document.querySelectorAll('.nav-item[data-role]').forEach(item => {
        const requiredRole = item.dataset.role;
        if (role === 'super_admin') {
            // Super admin sees everything
            item.style.display = '';
        } else if (requiredRole === 'partner_or_admin' && (role === 'partner' || role === 'super_admin')) {
            item.style.display = '';
        } else if (requiredRole === 'partner' && role === 'partner') {
            item.style.display = '';
        } else if (requiredRole === role) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
    // For org_user or education roles, hide all admin/super_admin items and show only core views
    if (role === 'org_user' || role.startsWith('education_')) {
        document.querySelectorAll('.nav-item[data-role]').forEach(i => i.style.display = 'none');
    }
    // For end_customer, show only read-only views (overview, devices, alerts)
    if (role === 'end_customer') {
        document.querySelectorAll('.nav-item[data-role]').forEach(i => i.style.display = 'none');
        // Also hide Insights & Reports section for end_customer
        document.querySelectorAll('.nav-section-title').forEach(el => {
            if (el.textContent.trim() === 'Insights & Reports' || el.textContent.trim() === 'ADMINISTRATION') {
                el.style.display = 'none';
            }
        });
    }
    // Hide upload card and org create form for partners (they can build but not upload base .exe)
    if (role === 'partner') {
        const uploadCard = document.getElementById('upload-card');
        if (uploadCard) uploadCard.style.display = 'none';
    }
}

function getOrgScope() {
    // Global org filter takes precedence
    if (_globalOrgFilter) return _globalOrgFilter;
    // Then partner filter
    if (_globalPartnerFilter) return '__PARTNER_SCOPE__:' + _globalPartnerFilter;
    try {
        const auth = JSON.parse(sessionStorage.getItem('catalyst_auth') || '{}');
        if ((auth.role === 'org_user' || auth.role === 'end_customer' || (auth.role && auth.role.startsWith('education_'))) && auth.org_id) return auth.org_id;
    } catch (e) { }
    return null;
}

function checkSession() {
    // TEMPORARY BYPASS FOR UI PREVIEW
    const authData = JSON.stringify({
        token: "dummy_preview_token",
        username: "TekkiX Admin",
        role: "super_admin",
        partner_id: null,
        org_id: null,
        login_time: new Date().toISOString(),
    });
    sessionStorage.setItem('catalyst_auth', authData);
    showApp('TekkiX Admin', 'super_admin');
    loadOverview();
    return true;
}

async function validateSession(token) {
    // TEMPORARY BYPASS
    loadOverview();
}

// Auto-restore session
checkSession();

// Fetch App Version
fetch('/api/health')
    .then(res => res.json())
    .then(data => {
        if (data.version) {
            _appVersion = data.version;
            const footer = document.getElementById('app-version-footer');
            if (footer) {
                footer.innerText = `BostonTechIndia · CatalystScan v${_appVersion}`;
            }
        }
    }).catch(e => console.error("Could not fetch version", e));

// ── Navigation ──
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        const view = item.dataset.view;
        if (!view) return; // If no data-view, let it act as a normal link

        e.preventDefault();
        switchView(view);
    });
});

// Keyboard shortcut: Press / to focus search
document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const search = document.getElementById('global-search');
        if (search) search.focus();
    }
});

// Auto-refresh timer for overview
let _overviewRefreshTimer = null;

function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Clear overview auto-refresh when leaving overview
    if (_overviewRefreshTimer) { clearInterval(_overviewRefreshTimer); _overviewRefreshTimer = null; }

    const view = document.getElementById(`view-${viewName}`);
    const nav = document.querySelector(`[data-view="${viewName}"]`);

    // 404 fallback: If no matching view element exists, show branded 404
    if (!view) {
        show404View(viewName);
        if (nav) nav.classList.add('active');
        return;
    }

    view.classList.add('active');
    if (nav) nav.classList.add('active');

    const titles = {
        overview: 'Fleet Overview',
        devices: 'Device Management',
        alerts: 'Tamper Alerts',
        licenses: 'License Management',
        orgs: 'Organizations',
        builder: 'Build .exe Package',
        ewaste: 'E-Waste Compliance',
        amc: 'AMC / Warranty Tracker',
        compliance: 'Compliance Reports',
        'mgmt-reports': 'Management Reports',
        'lab-util': 'Lab Utilization',
        'multi-org': 'Multi-Org Hierarchy',
        'alert-config': 'Alert Configurations',
        dbexplorer: 'Database Explorer',
        partners: 'Partner Management',
        users: 'User Management',
        'site-settings': 'Site Settings',
        'audit-log': 'Audit Log',
    };
    document.getElementById('page-title').textContent = titles[viewName] || 'Dashboard';

    // Load data for the view
    if (viewName === 'overview') {
        loadOverview();
        // Auto-refresh overview every 30 seconds to keep online/offline status current
        _overviewRefreshTimer = setInterval(loadOverview, 30000);
    }
    if (viewName === 'devices') loadDevices();
    if (viewName === 'alerts') loadAlerts();
    if (viewName === 'licenses') loadLicenses();
    if (viewName === 'orgs') loadOrgs();
    if (viewName === 'builder') { loadOrgs(); loadBuilds(); }
    if (viewName === 'ewaste') loadEwaste();
    if (viewName === 'amc') loadAmc();
    if (viewName === 'compliance') loadReportsView();
    if (viewName === 'mgmt-reports') loadMgmtReportsView();
    if (viewName === 'lab-util') loadLabUtil();
    if (viewName === 'multi-org') loadMultiOrg();
    if (viewName === 'alert-config') loadAlertConfig();
    if (viewName === 'partners') loadPartners();
    if (viewName === 'users') loadUsers();
    if (viewName === 'site-settings') loadSiteSettings();
    if (viewName === 'credits') loadCredits();
    if (viewName === 'audit-log') loadAuditLog(0);
    if (viewName === 'dbexplorer') {
        const tbody = document.getElementById('global-db-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="100%" class="loading">Select a table and click Sync</td></tr>';
    }
}

// 404 View for unimplemented features
function show404View(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    // Use a dynamically created 404 view
    let notFoundView = document.getElementById('view-404');
    if (!notFoundView) {
        notFoundView = document.createElement('div');
        notFoundView.id = 'view-404';
        notFoundView.className = 'view';
        document.getElementById('app-main').appendChild(notFoundView);
    }
    const prettyName = viewName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    notFoundView.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;padding:40px;">
            <div style="font-size:80px;margin-bottom:16px;opacity:0.3;"><iconify-icon icon="lucide:construction"></iconify-icon></div>
            <h2 style="font-size:28px;font-weight:700;color:var(--text-primary);margin-bottom:8px;">Feature Coming Soon</h2>
            <p style="font-size:16px;color:var(--text-muted);max-width:500px;margin-bottom:24px;">
                <strong>${escapeHTML(prettyName)}</strong> is currently under development and will be available in a future update.
            </p>
            <div style="display:flex;gap:12px;">
                <button class="btn btn-primary" onclick="switchView('overview')"><iconify-icon icon="lucide:arrow-left"></iconify-icon> Back to Overview</button>
                <button class="btn btn-ghost" onclick="window.open('mailto:support@bostontechindia.com?subject=Feature Request: ${encodeURIComponent(prettyName)}','_blank')"><iconify-icon icon="lucide:mail"></iconify-icon> Request Feature</button>
            </div>
            <p style="margin-top:32px;font-size:12px;color:var(--text-muted);opacity:0.6;">Error 404 — View not found</p>
        </div>
    `;
    notFoundView.classList.add('active');
    document.getElementById('page-title').textContent = 'Page Not Found';
}

// ── API Helpers ──
async function fetchJSON(url, options = {}) {
    const auth = sessionStorage.getItem('catalyst_auth');
    if (!auth) {
        console.warn('fetchJSON: No session token, skipping', url);
        return null;
    }
    let headers = {};
    try { headers['Authorization'] = 'Bearer ' + JSON.parse(auth).token; } catch (e) { }
    // Auto-inject org_id scope for org_user role
    let scopedUrl = url;
    const orgScope = getOrgScope();
    if (orgScope && url.startsWith('/api/dashboard/')) {
        const sep = url.includes('?') ? '&' : '?';
        scopedUrl = url + sep + 'org_id=' + encodeURIComponent(orgScope);
    }
    try {
        const res = await fetch(API + scopedUrl, { headers });
        if (res.status === 401) {
            console.warn('fetchJSON: 401 received, logging out');
            doLogout();
            return null;
        }
        if (!res.ok) {
            if (options.suppress404 && res.status === 404) return null;
            throw new Error(`HTTP ${res.status}`);
        }
        return await res.json();
    } catch (e) {
        console.error('API Error:', url, e);

        // --- START MOCK DATA FALLBACK FOR OFFLINE PREVIEW ---
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes('/api/dashboard/stats')) {
            return {
                "total_devices": 18,
                "online": 12,
                "offline": 6,
                "active_alerts": 2
            };
        }
        if (lowerUrl.includes('/api/dashboard/devices')) {
            return {
                "devices": [
                    { "fingerprint": "dev_fp_1", "hostname": "BMSIT-LAB1-PC01", "org_id": "BMSIT", "org_name": "BMSIT", "online": true, "last_seen": new Date().toISOString(), "total_scans": 10, "scans_used": 4, "scans_remaining": 6 },
                    { "fingerprint": "dev_fp_2", "hostname": "BMSIT-LAB1-PC02", "org_id": "BMSIT", "org_name": "BMSIT", "online": true, "last_seen": new Date().toISOString(), "total_scans": 10, "scans_used": 3, "scans_remaining": 7 },
                    { "fingerprint": "dev_fp_3", "hostname": "BOS-OFFICE-LPT09", "org_id": "Boston_Tech_India", "org_name": "Boston Tech India", "online": true, "last_seen": new Date().toISOString(), "total_scans": 5, "scans_used": 1, "scans_remaining": 4 },
                    { "fingerprint": "dev_fp_4", "hostname": "GEN-MOT-WORKSTN", "org_id": "Gen_Mot_Coils", "org_name": "Gen Mot Coils", "online": false, "last_seen": new Date(Date.now() - 3600000 * 2).toISOString(), "total_scans": 20, "scans_used": 15, "scans_remaining": 5 },
                    { "fingerprint": "dev_fp_5", "hostname": "BMSIT-LAB2-PC14", "org_id": "BMSIT", "org_name": "BMSIT", "online": false, "last_seen": new Date(Date.now() - 3600000 * 24).toISOString(), "total_scans": 10, "scans_used": 10, "scans_remaining": 0 }
                ]
            };
        }
        if (lowerUrl.includes('/api/dashboard/alerts')) {
            return {
                "total": 2,
                "alerts": [
                    {
                        "id": 1,
                        "org_name": "BMSIT",
                        "timestamp": new Date(Date.now() - 3600000).toISOString(),
                        "fingerprint": "dev_fp_5",
                        "resolved": 0,
                        "tamper_data": {
                            "changes": [
                                { "component": "RAM", "type": "Module Swap / Removal", "severity": "HIGH", "baseline": "16 GB DDR4", "current": "8 GB DDR4" }
                            ]
                        }
                    },
                    {
                        "id": 2,
                        "org_name": "Boston Tech India",
                        "timestamp": new Date(Date.now() - 3600000 * 4).toISOString(),
                        "fingerprint": "dev_fp_3",
                        "resolved": 0,
                        "tamper_data": {
                            "changes": [
                                { "component": "Storage", "type": "Disk Replacement", "severity": "MEDIUM", "baseline": "Crucial 500GB SSD", "current": "Kingston 240GB SSD" }
                            ]
                        }
                    }
                ]
            };
        }
        if (lowerUrl.includes('/health')) {
            return { "overall_grade": "A", "overall_score": 92 };
        }
        if (lowerUrl.includes('/orgs')) {
            return {
                "organizations": [
                    { "id": "BMSIT", "name": "BMSIT", "contact_email": "admin@bmsit.edu", "contact_phone": "+91-9876543210", "address": "Bengaluru, India", "partner_id": 1, "org_category": "Education Institution" },
                    { "id": "Boston_Tech_India", "name": "Boston Tech India", "contact_email": "info@bostontechindia.com", "contact_phone": "+91-8012345678", "address": "Chennai, India", "partner_id": null, "org_category": "Corporate" },
                    { "id": "Gen_Mot_Coils", "name": "Gen Mot Coils", "contact_email": "procurement@genmot.com", "contact_phone": "+91-7012345678", "address": "Pune, India", "partner_id": 2, "org_category": "Corporate" }
                ]
            };
        }
        if (lowerUrl.includes('/partners')) {
            return [
                { "id": 1, "name": "Computech Services", "contact_email": "partner@computech.in", "contact_phone": "+91-9988776655", "credits": 500 },
                { "id": 2, "name": "Apex System Integrators", "contact_email": "apex@apexsys.com", "contact_phone": "+91-9988112233", "credits": 250 }
            ];
        }
        if (lowerUrl.includes('/build-exe/list')) {
            return {
                "builds": [
                    { "filename": "CatalystScan_BMSIT_v1_20260609_043452.zip", "size_mb": 31.9, "created": new Date(Date.now() - 3600000 * 24 * 10).toISOString() },
                    { "filename": "CatalystScan_Boston_Tech_India_v15_20260621_070928.zip", "size_mb": 31.9, "created": new Date(Date.now() - 3600000 * 24 * 5).toISOString() }
                ]
            };
        }
        if (lowerUrl.includes('/build-exe/status')) {
            return { "exists": true, "size_mb": 43.9 };
        }
        // --- END MOCK DATA FALLBACK ---

        return null;
    }
}

async function postJSON(url, data, method) {
    const auth = sessionStorage.getItem('catalyst_auth');
    if (!auth) {
        console.warn('postJSON: No session token, skipping', url);
        return null;
    }
    let headers = { 'Content-Type': 'application/json' };
    try { headers['Authorization'] = 'Bearer ' + JSON.parse(auth).token; } catch (e) { }
    try {
        const res = await fetch(API + url, {
            method: method || 'POST',
            headers: headers,
            body: JSON.stringify(data),
        });
        if (res.status === 401) {
            doLogout();
            return null;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error('API Error:', url, e);
        return null;
    }
}

function timeAgo(dateStr) {
    if (!dateStr) return 'Never';
    let s = String(dateStr);
    if (!s.endsWith('Z') && !s.includes('+') && !s.includes('-', 10)) s += 'Z';
    const now = new Date();
    const then = new Date(s);
    if (isNaN(then.getTime())) return dateStr;
    const diff = Math.floor((now - then) / 1000);
    if (diff < 0) return 'Just now';
    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    const days = Math.floor(diff / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

function truncate(str, len) {
    if (!str) return '-';
    return str.length > len ? str.slice(0, len) + '...' : str;
}


// â”€â”€ Overview â”€â”€
async function loadOverview(force = false) {
    if (_isRefreshing && !force) return;
    _isRefreshing = true;

    try {
        const container = document.getElementById('devices-table-body');

        // Show Skeleton UI if force reload or empty
        if (force || !container || !container.innerHTML.includes('<tr>')) {
            document.getElementById('stat-total').classList.add('skeleton');
            document.getElementById('stat-online').classList.add('skeleton');
            document.getElementById('stat-offline').classList.add('skeleton');
            document.getElementById('stat-alerts').classList.add('skeleton');

            // Adding a subtle indicator
            const title = document.getElementById('page-title');
            if (title && !title.innerHTML.includes('Auto-refreshing')) {
                title.innerHTML = 'Fleet Overview <span style="font-size: 12px; color: var(--text-muted); font-weight: normal; margin-left: 10px;">↻ Auto-refreshing...</span>';
            }
        }

        const stats = await fetchJSON('/api/dashboard/stats');
        if (stats) {
            document.getElementById('stat-total').textContent = stats.total_devices || 0;
            document.getElementById('stat-online').textContent = stats.online || 0;
            document.getElementById('stat-offline').textContent = stats.offline || 0;
            document.getElementById('stat-alerts').textContent = stats.active_alerts || 0;

            // Dynamic accent borders for critical KPI cards
            const cards = document.querySelectorAll('.stat-card');
            if (cards[2]) cards[2].style.borderLeft = (stats.offline || 0) > 0 ? '3px solid #ef4444' : '';
            if (cards[3]) cards[3].style.borderLeft = (stats.active_alerts || 0) > 0 ? '3px solid #f59e0b' : '';
        }

        const devData = await fetchJSON('/api/dashboard/devices');
        const tbody = document.getElementById('devices-table-body');
        if (devData && devData.devices && devData.devices.length > 0) {
            tbody.innerHTML = devData.devices.slice(0, 10).map(d => `
                <tr>
                    <td><span class="status-badge ${d.online ? 'status-online' : 'status-offline'}">
                        ${d.online ? '<span class="dot dot-green"></span> Online' : '<span class="dot dot-red"></span> Offline'}
                    </span></td>
                    <td><strong>${escapeHTML(d.hostname) || 'Unknown'}</strong></td>
                    <td>${escapeHTML(d.org_name) || '-'}</td>
                    <td class="text-muted">${timeAgo(d.last_seen)}</td>
                    <td><span title="${d.scans_used} used of ${d.total_scans} total">${d.scans_used} / ${d.total_scans}</span></td>
                    <td><button class="btn btn-ghost btn-sm" onclick="viewDevice('${escapeHTML(d.fingerprint)}')">View</button></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:48px 24px;color:var(--text-muted);"><div style="font-size:32px;margin-bottom:12px;"><iconify-icon icon="lucide:laptop"></iconify-icon></div><div style="font-size:14px;font-weight:500;">No devices registered yet</div><div style="font-size:12px;margin-top:4px;">Deploy CatalystScan agents to see devices here.</div></td></tr>`;
        }

        loadAlertsPreview();
        loadFleetHealth();

        // Remove skeletons
        document.getElementById('stat-total').classList.remove('skeleton');
        document.getElementById('stat-online').classList.remove('skeleton');
        document.getElementById('stat-offline').classList.remove('skeleton');
        document.getElementById('stat-alerts').classList.remove('skeleton');

        const title = document.getElementById('page-title');
        if (title) title.innerHTML = 'Fleet Overview';

    } catch (e) {
        console.error("Overview load failed", e);
    } finally {
        _isRefreshing = false;
    }
}

// ── Devices ──
async function loadDevices() {
    const devData = await fetchJSON('/api/dashboard/devices');
    const tbody = document.getElementById('all-devices-table');
    if (devData && devData.devices && devData.devices.length > 0) {
        const rows = await Promise.all(devData.devices.map(async d => {
            let gradeHtml = '<span class="grade-badge grade-unknown"> - </span>';
            try {
                const healthData = await fetchJSON(`/api/dashboard/device/${escapeHTML(d.fingerprint)}/health`, { suppress404: true });
                if (healthData && healthData.overall_grade) {
                    const g = healthData.overall_grade;
                    if (!d.online) {
                        gradeHtml = `<span class="grade-badge grade-unknown" data-tooltip="Device offline — last grade: ${g} (${healthData.overall_score})">— Offline</span>`;
                    } else {
                        const gradeClass = { 'A': 'grade-a', 'B': 'grade-b', 'C': 'grade-c', 'D': 'grade-d', 'F': 'grade-f' }[g] || 'grade-unknown';
                        gradeHtml = `<span class="grade-badge ${gradeClass}" data-tooltip="Health score: ${healthData.overall_score}/100">${g} (${healthData.overall_score})</span>`;
                    }
                }
            } catch (e) { }
            return `
            <tr>
                <td><input type="checkbox" class="device-checkbox" data-fingerprint="${escapeHTML(d.fingerprint)}" onchange="toggleDeviceSelect(this.dataset.fingerprint, this); updateBatchToolbar();"></td>
                <td><span class="status-badge ${d.online ? 'status-online' : 'status-offline'}">
                    ${d.online ? '<span class="dot dot-green"></span> Online' : '<span class="dot dot-red"></span> Offline'}
                </span></td>
                <td><strong>${escapeHTML(d.hostname) || 'Unknown'}</strong></td>
                <td>${escapeHTML(d.org_name) || '-'}</td>
                <td class="fingerprint" data-tooltip="${escapeHTML(d.fingerprint)}">${truncate(d.fingerprint, 16)}</td>
                <td>${gradeHtml}</td>
                <td class="text-muted">${timeAgo(d.last_seen)}</td>
                <td>${d.scans_used}</td>
                <td class="${d.scans_remaining <= 0 ? 'text-red' : 'text-green'}">${d.scans_remaining}</td>
                <td style="white-space:nowrap;">
                    <button class="btn btn-primary btn-sm btn-icon" onclick="downloadReport('${escapeHTML(d.fingerprint)}')" title="Download Report"><iconify-icon icon="lucide:file-text"></iconify-icon> Report</button>
                    <button class="btn btn-ghost btn-sm btn-icon" onclick="viewDevice('${escapeHTML(d.fingerprint)}')" title="View Details"><iconify-icon icon="lucide:search"></iconify-icon> Details</button>
                    <button class="btn btn-success btn-sm btn-icon" onclick="quickAddScans('${escapeHTML(d.fingerprint)}')" title="Add 2 scan credits"><iconify-icon icon="lucide:plus"></iconify-icon> Scans</button>
                </td>
            </tr>`;
        }));
        tbody.innerHTML = rows.join('');
    } else {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:48px 24px;color:var(--text-muted);"><div style="font-size:32px;margin-bottom:12px;"><iconify-icon icon="lucide:laptop"></iconify-icon></div><div style="font-size:14px;font-weight:500;">No devices registered yet</div><div style="font-size:12px;margin-top:4px;">Deploy CatalystScan agents to see devices here.</div></td></tr>`;
    }
}



async function downloadReport(fingerprint) {
    let headers = {};
    const auth = sessionStorage.getItem('catalyst_auth');
    if (auth) {
        try { headers['Authorization'] = 'Bearer ' + JSON.parse(auth).token; } catch (e) { }
    }
    try {
        const res = await fetch(`/api/dashboard/device/${escapeHTML(fingerprint)}/report`, { headers });
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Assessment_Report_${fingerprint.substring(0, 8)}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            alert('Failed to download report');
        }
    } catch (e) {
        console.error(e);
        alert('Report download error');
    }
}

// â”€â”€ Alerts â”€â”€
async function loadAlertsPreview() {
    const alertData = await fetchJSON('/api/dashboard/alerts');
    const container = document.getElementById('alerts-overview');
    if (alertData && alertData.alerts && alertData.alerts.length > 0) {
        const badge = document.getElementById('alert-badge');
        if (badge) {
            badge.textContent = alertData.total;
            badge.style.display = 'inline';
        }
        container.innerHTML = alertData.alerts.slice(0, 3).map(a => renderAlert(a)).join('');
    } else {
        container.innerHTML = `<div style="text-align:center;padding:32px 24px;color:var(--text-muted);"><div style="font-size:28px;margin-bottom:8px;"><iconify-icon icon="lucide:shield"></iconify-icon></div><div style="font-size:13px;font-weight:500;">No security alerts detected</div><div style="font-size:12px;margin-top:4px;">All devices are operating normally.</div></div>`;
    }
}

async function loadAlerts() {
    const showResolved = document.getElementById('show-resolved-toggle');
    const includeResolved = showResolved ? showResolved.checked : false;

    const params = new URLSearchParams();
    if (includeResolved) params.append('include_resolved', 'true');

    const alertUrl = '/api/dashboard/alerts' + (params.toString() ? '?' + params.toString() : '');
    const alertData = await fetchJSON(alertUrl);
    const container = document.getElementById('alerts-full');
    if (!container) return;

    // Build header with toggle
    let headerHtml = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <span style="font-size:13px;color:var(--text-muted);">${alertData ? alertData.total : 0} alert(s)</span>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;color:var(--text-muted);">
            <input type="checkbox" id="show-resolved-toggle" ${includeResolved ? 'checked' : ''} onchange="loadAlerts()">
            Show Resolved
        </label>
    </div>`;

    if (alertData && alertData.alerts && alertData.alerts.length > 0) {
        container.innerHTML = headerHtml + alertData.alerts.map(a => renderAlert(a)).join('');
    } else {
        container.innerHTML = headerHtml + '<div class="empty-state">No tamper alerts detected.</div>';
    }
}

function renderAlert(alert) {
    let changesHtml = '';
    if (alert.tamper_data && alert.tamper_data.changes) {
        changesHtml = alert.tamper_data.changes.map(c => {
            const comp = escapeHTML(c.component);
            const type = escapeHTML(c.type);
            const sev = escapeHTML(c.severity);
            let detail = '';
            if (c.baseline) {
                detail = '<br>Baseline: ' + escapeHTML(c.baseline) + ' \u2192 Current: ' + escapeHTML(c.current);
            }
            return '<div class="alert-change"><strong>' + comp + '</strong>  -  ' + type + detail + '<br><span class="text-muted">Severity: ' + sev + '</span></div>';
        }).join('');
    }

    const isResolved = alert.resolved === 1;
    const resolvedInfo = isResolved
        ? '<span style="color:var(--text-muted);font-size:12px;">\u2705 Resolved ' + (alert.resolved_at ? timeAgo(alert.resolved_at) : '') + ' by ' + escapeHTML(alert.resolved_by || 'system') + '</span>'
        : '<button class="btn btn-success btn-sm" onclick="resolveAlert(' + alert.id + ')">\u2705 Resolve</button>';

    return '<div class="alert-item" style="' + (isResolved ? 'opacity:0.6;' : '') + '">'
        + '<div class="alert-item-header">'
        + '<h4>&#9888; Tamper Alert  -  ' + (escapeHTML(alert.org_name) || 'Unknown') + '</h4>'
        + '<span class="text-muted">' + timeAgo(alert.timestamp) + '</span>'
        + '</div>'
        + '<p>Device: <span class="fingerprint">' + truncate(alert.fingerprint, 24) + '</span></p>'
        + changesHtml
        + '<div style="margin-top:8px;">' + resolvedInfo + '</div>'
        + '</div>';
}

async function resolveAlert(alertId) {
    const result = await postJSON('/api/dashboard/alerts/' + alertId + '/resolve', {}, 'PUT');
    if (result && result.success) {
        showToast('Alert resolved successfully');
        loadAlerts();
        loadAlertsPreview();
    } else {
        showToast('Failed to resolve alert', 'error');
    }
}

// â”€â”€ Licenses â”€â”€
async function loadLicenses() {
    const devData = await fetchJSON('/api/dashboard/devices');
    const tbody = document.getElementById('license-table');
    if (devData && devData.devices && devData.devices.length > 0) {
        tbody.innerHTML = devData.devices.map(d => `
            <tr>
                <td>${escapeHTML(d.hostname) || 'Unknown'}</td>
                <td class="fingerprint">${truncate(d.fingerprint, 16)}</td>
                <td>${d.total_scans}</td>
                <td>${d.scans_used}</td>
                <td class="${d.scans_remaining <= 0 ? 'text-red' : 'text-green'}">${d.scans_remaining}</td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="quickAddScans('${escapeHTML(d.fingerprint)}', 2)">+2</button>
                    <button class="btn btn-primary btn-sm" onclick="quickAddScans('${escapeHTML(d.fingerprint)}', 10)">+10</button>
                </td>
            </tr>
        `).join('');
    }
}

async function quickAddScans(fingerprint, count = 2) {
    const result = await postJSON('/api/license/add', { fingerprint, count });
    if (result && result.success) refreshData();
}

function downloadBulkTemplate() {
    // Generate template with current device data
    fetchJSON('/api/dashboard/devices').then(data => {
        let csv = 'fingerprint,hostname,scans_to_add\n';
        if (data && data.devices) {
            data.devices.forEach(d => {
                csv += `${escapeHTML(d.fingerprint)},${escapeHTML(d.hostname) || 'Unknown'},2\n`;
            });
        } else {
            csv += 'paste_fingerprint_here,device_hostname,2\n';
        }
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `catalystscan_license_template_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    });
}

async function uploadBulkCSV(input) {
    const file = input.files[0];
    if (!file) return;
    const container = document.getElementById('bulk-result');
    container.innerHTML = '<p class="loading">Processing CSV...</p>';

    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
        container.innerHTML = '<div style="color:#ef4444;">âŒ CSV must have a header row and at least one data row.</div>';
        return;
    }

    // Parse header
    const header = lines[0].toLowerCase().replace(/"/g, '').split(',').map(h => h.trim());
    const fpIdx = header.indexOf('fingerprint');
    const countIdx = header.indexOf('scans_to_add');
    if (fpIdx < 0 || countIdx < 0) {
        container.innerHTML = '<div style="color:#ef4444;">âŒ CSV must have columns: fingerprint, scans_to_add</div>';
        return;
    }

    // Process rows
    let successCount = 0, failCount = 0, results = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].replace(/"/g, '').split(',').map(c => c.trim());
        const fp = cols[fpIdx];
        const count = parseInt(cols[countIdx]);
        if (!fp || isNaN(count) || count <= 0) { failCount++; continue; }

        const res = await postJSON('/api/license/add', { fingerprint: fp, count });
        if (res && res.success) {
            successCount++;
            results.push(`${fp.substring(0, 12)}... +${count}`);
        } else {
            failCount++;
            results.push(`âŒ ${fp.substring(0, 12)}... failed`);
        }
    }

    container.innerHTML = `
        <div style="padding:12px;background:rgba(34,197,94,0.1);border-radius:8px;margin-bottom:8px;">
            <strong>Bulk Upload Complete:</strong> ${successCount} succeeded, ${failCount} failed
        </div>
        <div style="font-size:12px;color:var(--text-muted);max-height:150px;overflow-y:auto;">
            ${results.join('<br>')}
        </div>
    `;
    input.value = ''; // Reset file input
    loadLicenses(); // Refresh table
}

// â”€â”€ Organizations â”€â”€
async function createOrg() {
    const orgId = document.getElementById('org-id').value.trim();
    const orgName = document.getElementById('org-name').value.trim();
    if (!orgId || !orgName) return alert('Organization ID and Name are required');

    const btn = event.target;
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Creating...';

    const partnerSel = document.getElementById('org-partner-select');
    const partnerId = partnerSel && partnerSel.value ? parseInt(partnerSel.value) : null;

    const categorySel = document.getElementById('org-category');
    const orgCategory = categorySel ? categorySel.value : "Corporate";

    const payload = {
        org_id: orgId,
        org_category: orgCategory,
        name: orgName,
        contact_email: document.getElementById('org-email').value.trim() || null,
        contact_phone: document.getElementById('org-phone').value.trim() || null,
        address: null,
        partner_id: partnerId
    };

    try {
        const result = await postJSON('/api/dashboard/orgs', payload);

        if (result && result.success) {
            showToast('Organization created successfully!', 'success');
            document.getElementById('org-id').value = '';
            document.getElementById('org-name').value = '';
            document.getElementById('org-email').value = '';
            document.getElementById('org-phone').value = '';
            if (partnerSel) partnerSel.value = '';
            loadOrgs();
        } else {
            showToast('Failed to create Organization: ' + (result?.detail || 'Unknown error'), 'error');
        }
    } catch (e) {
        showToast('Network error while creating organization.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

async function loadOrgs() {
    const orgData = await fetchJSON('/api/dashboard/orgs');
    const container = document.getElementById('orgs-list');
    const orgSelect = document.getElementById('build-org-select');

    // Load partners for the partner dropdown on org creation form (super_admin only)
    const partnerSel = document.getElementById('org-partner-select');
    const authInfo = JSON.parse(sessionStorage.getItem('catalyst_auth') || '{}');
    if (partnerSel && authInfo.role === 'super_admin') {
        const partnerData = await fetchJSON('/api/admin/partners');
        const pList = Array.isArray(partnerData) ? partnerData : (partnerData && partnerData.partners ? partnerData.partners : []);
        if (pList.length > 0) {
            partnerSel.innerHTML = '<option value="">No Partner (Unassigned)</option>' +
                pList.map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('');
        }
    } else if (partnerSel) {
        partnerSel.style.display = 'none';
    }

    if (orgData && orgData.organizations) {
        // Populate Organizations Page View
        container.innerHTML = orgData.organizations.map(o => {
            const partnerLabel = o.partner_id ? `Partner: ${o.partner_id}` : 'Unassigned';
            return `
            <div class="org-card" style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; background:var(--bg-white); border:1px solid var(--border); margin-bottom:10px; border-radius:8px; transition:box-shadow 0.2s;">
                <div>
                    <h4 style="margin:0; font-size:15px; font-weight:600; color:var(--text-primary);">${escapeHTML(o.name)}</h4>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin:4px 0 0;">ID: ${o.id} | Email: ${escapeHTML(o.contact_email) || 'N/A'} | <span style="color:#6366f1;font-weight:500;">${partnerLabel}</span></p>
                </div>
                <div style="display:flex; gap:8px;">
					<button class="btn btn-ghost btn-sm" onclick="openEditModal('${o.id}', '${escapeHTML(o.name)}', '${escapeHTML(o.contact_email) || ''}', '${escapeHTML(o.contact_phone) || ''}', '${escapeHTML(o.address) || ''}')">✏️ Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteOrgConfirm('${o.id}')">🗑️ Delete</button>
                </div>
            </div>`;
        }).join('');

        // Populate Builder Dropdown
        if (orgSelect) {
            orgSelect.innerHTML = '<option value="" disabled selected>-- Select an Organization --</option>' +
                orgData.organizations.map(o => `<option value="${o.id}" data-name="${escapeHTML(o.name)}">${escapeHTML(o.name)} (${o.id})</option>`).join('');
        }
    } else if (orgSelect) {
        orgSelect.innerHTML = '<option value="" disabled selected>No Organizations Found</option>';
    }
}

// Function to open modal and populate fields
function openEditModal(id, name, email, phone, address) {
    document.getElementById('edit-org-id').value = id;
    document.getElementById('edit-org-name').value = name;
    document.getElementById('edit-org-email').value = email;
    document.getElementById('edit-org-phone').value = phone;
    document.getElementById('edit-org-address').value = address;

    document.getElementById('edit-org-modal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('edit-org-modal').style.display = 'none';
}

// Handle form submission
document.getElementById('edit-org-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const orgId = document.getElementById('edit-org-id').value;
    const payload = {
        new_name: document.getElementById('edit-org-name').value.trim(),
        new_contact_email: document.getElementById('edit-org-email').value.trim() || null,
        new_contact_phone: document.getElementById('edit-org-phone').value.trim() || null,
        new_address: document.getElementById('edit-org-address').value.trim() || null
    };

    let headers = { 'Content-Type': 'application/json' };
    const auth = sessionStorage.getItem('catalyst_auth');
    if (auth) { try { headers['Authorization'] = 'Bearer ' + JSON.parse(auth).token; } catch (e) { } }

    const response = await fetch(`/api/dashboard/orgs/${orgId}/rename`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (response.ok) {
        showToast("Organization updated successfully!", "success");
        closeEditModal();
        loadOrgs(); // Refresh the list
    } else {
        showToast("Failed to update organization.", "error");
    }
});

async function renameOrgPrompt(orgId, currentName) {
    const newName = prompt(`Enter new name for "${currentName}":`, currentName);
    if (!newName) return;

    const newEmail = prompt("Enter new Contact Email:");
    const newAddress = prompt("Enter new Address:");
    const newPhone = prompt("Enter new Contact Phone:");

    let headers = { 'Content-Type': 'application/json' };
    const auth = sessionStorage.getItem('catalyst_auth');
    if (auth) { try { headers['Authorization'] = 'Bearer ' + JSON.parse(auth).token; } catch (e) { } }

    const response = await fetch(`/api/dashboard/orgs/${orgId}/rename`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({
            new_name: newName.trim(),
            new_contact_email: newEmail ? newEmail.trim() : null,
            new_contact_phone: newPhone ? newPhone.trim() : null,
            new_address: newAddress ? newAddress.trim() : null
        })
    });

    if (response.ok) {
        showToast("Organization updated successfully.", "success");
        loadOrgs();
    } else {
        showToast("Error: Failed to update details.", "error");
    }
}


async function deleteOrgConfirm(orgId) {
    if (confirm(`Delete organization "${orgId}"?`)) {
        let headers = {};
        const auth = sessionStorage.getItem('catalyst_auth');
        if (auth) { try { headers['Authorization'] = 'Bearer ' + JSON.parse(auth).token; } catch (e) { } }
        try {
            const res = await fetch(`/api/dashboard/orgs/${encodeURIComponent(orgId)}`, { method: 'DELETE', headers });
            if (res.ok) {
                loadOrgs();
                showToast("Organization deleted successfully", "success");
            } else {
                const data = await res.json().catch(() => ({}));
                showToast(data.detail || "Failed to delete organization", "error");
            }
        } catch (e) {
            showToast("Error deleting organization", "error");
        }
    }
}

// ── Exe Builder ──
async function loadBuilds() {
    const data = await fetchJSON('/api/build-exe/list');
    const container = document.getElementById('builds-list');
    if (data && data.builds) {
        container.innerHTML = data.builds.map(b => `
            <div class="org-card" style="display:flex; justify-content:space-between; align-items:center; padding:10px;">
                <div><h4> ${b.filename}</h4><p>${b.size_mb} MB | ${timeAgo(b.created)}</p></div>
                <div style="display:flex; gap:8px">
                    <button class="btn btn-primary btn-sm" onclick="downloadExe('${b.filename}')"> Download</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteBuild('${b.filename}')">🗑</button>
                </div>
            </div>`).join('');
    }
    checkExeStatus();
}

async function checkExeStatus() {
    const statusDiv = document.getElementById('exe-status');
    const data = await fetchJSON('/api/build-exe/status');
    if (data && data.exists) {
        statusDiv.innerHTML = `<p style="color:var(--accent-green)">Base .exe ready (${data.size_mb} MB)</p>`;
    } else {
        statusDiv.innerHTML = `<p style="color:var(--accent-red)"><iconify-icon icon="lucide:x-circle"></iconify-icon> Base .exe missing</p>`;
    }
}

async function uploadExe() {
    const fileInput = document.getElementById('exe-file-input');
    if (!fileInput.files || fileInput.files.length === 0) {
        return showToast("Please select a CatalystScan.exe file first.", "error");
    }
    const btn = document.getElementById('upload-btn');
    const progContainer = document.getElementById('upload-progress-container');
    const progBar = document.getElementById('upload-progress-bar');
    const progText = document.getElementById('upload-status-text');

    btn.disabled = true;
    btn.innerText = " Uploading...";
    progContainer.style.display = 'block';
    progBar.style.width = '0%';
    progText.innerText = 'Uploading... 0%';

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/build-exe/upload', true);

    const auth = sessionStorage.getItem('catalyst_auth');
    if (auth) {
        try { xhr.setRequestHeader('Authorization', 'Bearer ' + JSON.parse(auth).token); } catch (e) { }
    }

    xhr.upload.addEventListener('progress', function (e) {
        if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            progBar.style.width = percentComplete + '%';
            progText.innerText = 'Uploading... ' + percentComplete + '%';
        }
    });

    xhr.onload = function () {
        btn.disabled = false;
        btn.innerText = " Upload .exe";
        if (xhr.status >= 200 && xhr.status < 300) {
            progText.innerText = 'Upload Complete!';
            progBar.style.background = 'var(--accent-green)';
            setTimeout(() => { progContainer.style.display = 'none'; progBar.style.background = 'var(--accent-blue)'; }, 3000);
            checkExeStatus();
        } else {
            progText.innerText = '<iconify-icon icon="lucide:x-circle"></iconify-icon> Upload Failed';
            progBar.style.background = 'var(--accent-red)';
            showToast("Upload failed. Check server logs.", "error");
        }
    };

    xhr.onerror = function () {
        btn.disabled = false;
        btn.innerText = " Upload .exe";
        progText.innerText = '<iconify-icon icon="lucide:x-circle"></iconify-icon> Network Error';
        progBar.style.background = 'var(--accent-red)';
        showToast("Upload network error.", "error");
    };

    xhr.send(formData);
}

async function buildExe() {
    const orgSelect = document.getElementById('build-org-select');
    if (!orgSelect || !orgSelect.value) return showToast('Please select an Organization first.', 'error');
    const selectedOption = orgSelect.options[orgSelect.selectedIndex];

    const payload = {
        org_name: selectedOption.getAttribute('data-name'),
        org_id: orgSelect.value,
        telemetry_url: document.getElementById('build-telemetry-url').value.trim(),
        scan_limit: parseInt(document.getElementById('build-scan-limit').value) || 2
    };

    if (!payload.org_name || !payload.org_id) return showToast('Invalid Organization selection.', 'error');

    const btn = document.getElementById('build-btn');
    btn.disabled = true;
    btn.innerText = " Building...";

    try {
        let headers = { 'Content-Type': 'application/json' };
        const auth = sessionStorage.getItem('catalyst_auth');
        if (auth) { try { headers['Authorization'] = 'Bearer ' + JSON.parse(auth).token; } catch (e) { } }
        const res = await fetch('/api/build-exe', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('Custom .exe generated successfully!', 'success');
            loadBuilds();
        } else {
            showToast('Build failed: ' + (data.error || 'Server error'), 'error');
        }
    } catch (e) {
        showToast("Generation error.", "error");
    } finally {
        btn.disabled = false;
        btn.innerText = " Generate .exe Package";
    }
}

async function deleteBuild(filename) {
    if (!confirm(`Delete generated build "${filename}"?`)) return;
    let headers = {};
    const auth = sessionStorage.getItem('catalyst_auth');
    if (auth) { try { headers['Authorization'] = 'Bearer ' + JSON.parse(auth).token; } catch (e) { } }
    const res = await fetch(`/api/build-exe/${filename}`, { method: 'DELETE', headers });
    if (res.ok) {
        loadBuilds();
    } else {
        showToast("Delete failed.", "error");
    }
}

async function downloadExe(filename) {
    let headers = {};
    const auth = sessionStorage.getItem('catalyst_auth');
    if (auth) {
        try { headers['Authorization'] = 'Bearer ' + JSON.parse(auth).token; } catch (e) { }
    }

    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = " Downloading...";
    btn.disabled = true;

    try {
        const res = await fetch(`/api/build-exe/download/${filename}`, { headers });
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            showToast('Failed to download build.', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Download error', 'error');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// ── Device Modal ──
async function viewDevice(fingerprint) {
    document.getElementById('device-modal').style.display = 'flex';
    document.getElementById('modal-body').innerHTML = '<p class="loading">Loading device details...</p>';

    const data = await fetchJSON('/api/dashboard/device/' + encodeURIComponent(fingerprint));
    const healthData = await fetchJSON('/api/dashboard/device/' + encodeURIComponent(fingerprint) + '/health', { suppress404: true });

    if (!data) {
        document.getElementById('modal-body').innerHTML = '<p style="color:red;">Device not found.</p>';
        return;
    }

    const { device, latest_scan, scan_history } = data;
    const h = healthData || {};
    const gradeColors = { A: '#22c55e', B: '#84cc16', C: '#eab308', D: '#f97316', F: '#ef4444' };
    const gradeColor = gradeColors[h.overall_grade] || '#64748b';

    // Extract hardware info from latest scan
    let cpuInfo = '-', ramInfo = '-', diskInfo = '-', osInfo = '-', gpuInfo = '-', batteryInfo = '-';
    if (latest_scan && latest_scan.scan_data) {
        const sd = typeof latest_scan.scan_data === 'string' ? JSON.parse(latest_scan.scan_data) : latest_scan.scan_data;
        cpuInfo = sd.cpu?.brand || sd.cpu?.model || '-';
        ramInfo = sd.ram?.total_gb ? sd.ram.total_gb + ' GB' : '-';
        diskInfo = sd.storage?.drives?.[0]?.capacity_gb
            ? sd.storage.drives[0].capacity_gb + ' GB ' + (sd.storage.drives[0].media_type || '')
            : '-';
        osInfo = sd.os?.os_name || sd.os?.system || sd.os?.name || '-';
        gpuInfo = sd.gpus?.[0]?.name || sd.gpu?.model || sd.graphics || '-';

        let batt = null;
        if (sd.battery && Array.isArray(sd.battery) && sd.battery.length > 0) batt = sd.battery[0];
        else if (sd.battery && typeof sd.battery === 'object') batt = sd.battery;

        if (batt) {
            const design = batt.design_capacity_mwh || 0;
            const full = batt.full_charge_capacity_mwh || 0;
            const cycleCount = batt.cycle_count !== undefined ? batt.cycle_count : 'Unknown';
            if (design > 0 && full > 0) {
                const health = Math.round((full / design) * 100);
                batteryInfo = `Health: ${health}% | Wear: ${100 - health}% | Cycles: ${cycleCount}`;
            } else if (batt.health_status) {
                batteryInfo = `Status: ${batt.health_status} | Cycles: ${cycleCount}`;
            } else {
                batteryInfo = 'Present (No health data available)';
            }
        } else {
            batteryInfo = 'Not Present / Desktop';
        }
    }

    // Health component breakdown
    let componentHtml = '';
    if (h.health && h.health.components) {
        const components = h.health.components;
        if (typeof components === 'object') {
            componentHtml = Object.entries(components).map(([name, comp]) => {
                if (!comp || typeof comp !== 'object') return '';
                const cc = gradeColors[comp.grade] || '#64748b';
                return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:6px;margin-bottom:4px;">'
                    + '<span>' + escapeHTML(name) + '</span>'
                    + '<span style="font-weight:700;color:' + cc + '">' + (comp.score || 0) + '%</span>'
                    + '</div>';
            }).join('');
        }
    } else if (h.components && h.components.length > 0) {
        componentHtml = h.components.map(c => {
            const cc = gradeColors[c.grade] || '#64748b';
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:6px;margin-bottom:4px;">'
                + '<span>' + escapeHTML(c.component) + '</span>'
                + '<span style="font-weight:700;color:' + cc + '">' + (c.score || 0) + '%</span>'
                + '</div>';
        }).join('');
    }

    // Scan history timeline
    let scanHistoryHtml = '';
    if (scan_history && scan_history.length > 0) {
        scanHistoryHtml = '<h4 style="color:var(--text-primary);margin:16px 0 8px;">📈 Scan History</h4>';
        scanHistoryHtml += scan_history.map(s => {
            const gc = gradeColors[s.overall_grade] || '#64748b';
            return '<div style="display:flex;align-items:center;gap:10px;padding:6px 10px;border-left:3px solid ' + gc + ';margin-bottom:4px;background:rgba(255,255,255,0.02);border-radius:0 6px 6px 0;">'
                + '<span style="font-weight:700;color:' + gc + ';min-width:28px;">' + (s.overall_grade || '?') + '</span>'
                + '<span style="font-size:13px;">' + (s.overall_score || 0) + '/100</span>'
                + '<span style="flex:1;text-align:right;font-size:11px;color:var(--text-muted);">' + timeAgo(s.timestamp) + '</span>'
                + '</div>';
        }).join('');
    } else {
        scanHistoryHtml = '<h4 style="color:var(--text-primary);margin:16px 0 8px;">📈 Scan History</h4>'
            + '<p style="font-size:12px;color:var(--text-muted);">No scan history available.</p>';
    }

    const vitalsRes = await fetchJSON('/api/dashboard/device/' + encodeURIComponent(fingerprint) + '/vitals/latest', { suppress404: true }).catch(() => null);
    const vitals = vitalsRes && vitalsRes.latest_vitals ? vitalsRes.latest_vitals : null;

    let vitalsHtml = '';
    if (vitals) {
        vitalsHtml = '<h4 style="color:var(--text-primary);margin-bottom:12px;">📊 Live Vitals</h4>'
            + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:center;margin-bottom:16px;">'
            + '<div style="padding:10px;background:rgba(59,130,246,0.1);border-radius:8px;">'
            + '<div style="font-size:20px;font-weight:700;color:#3b82f6;">' + Math.round(vitals.cpu_load_pct || 0) + '%</div>'
            + '<div style="font-size:11px;color:var(--text-muted)">CPU Load</div></div>'
            + '<div style="padding:10px;background:rgba(168,85,247,0.1);border-radius:8px;">'
            + '<div style="font-size:20px;font-weight:700;color:#a855f7;">' + Math.round(vitals.memory_used_pct || 0) + '%</div>'
            + '<div style="font-size:11px;color:var(--text-muted)">RAM Used (' + (vitals.memory_available_gb || 0) + 'GB free)</div></div>'
            + '</div>';
    } else {
        vitalsHtml = '<h4 style="color:var(--text-primary);margin-bottom:12px;">📊 Live Vitals</h4><p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">No live vitals data available yet.</p>';
    }

    let eventsHtml = '<h4 style="color:var(--text-primary);margin:16px 0 8px;"><iconify-icon icon="lucide:alert-triangle"></iconify-icon> System Events</h4>';
    let hasEvents = false;

    if (vitals && vitals.os_issues_json && vitals.os_issues_json !== '[]') {
        try {
            const issues = JSON.parse(vitals.os_issues_json);
            if (issues.length > 0) {
                hasEvents = true;
                eventsHtml += issues.map(iss => '<div style="padding:6px 10px;background:rgba(239,68,68,0.1);border-left:3px solid #ef4444;border-radius:4px;margin-bottom:6px;font-size:12px;color:#ef4444;">🚨 ' + escapeHTML(iss) + '</div>').join('');
            }
        } catch (e) { }
    }

    if (h.health && h.health.issues && h.health.issues.length > 0) {
        hasEvents = true;
        eventsHtml += h.health.issues.map(iss => '<div style="padding:6px 10px;background:rgba(234,179,8,0.1);border-left:3px solid #eab308;border-radius:4px;margin-bottom:6px;font-size:12px;color:#eab308;"><iconify-icon icon="lucide:alert-triangle"></iconify-icon> ' + escapeHTML(iss) + '</div>').join('');
    }

    if (!hasEvents) {
        eventsHtml += '<p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">No critical events or issues found.</p>';
    }

    document.getElementById('modal-body').innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">'
        + '<!-- Left Column: System Info -->'
        + '<div>'
        + '<h4 style="color:var(--text-primary);margin-bottom:12px;">System Information</h4>'
        + '<div style="display:grid;gap:8px;">'
        + '<div class="detail-item"><label>Hostname</label><span><strong>' + (escapeHTML(device.hostname) || 'Unknown') + '</strong></span></div>'
        + '<div class="detail-item"><label>Organization</label><span>' + (escapeHTML(device.org_name) || '-') + '</span></div>'
        + '<div class="detail-item"><label>Status</label><span>' + (device.online ? '<span style="color:#22c55e;"><span class="dot dot-green"></span> Online</span>' : '<span style="color:#ef4444;"><span class="dot dot-red"></span> Offline</span>') + '</span></div>'
        + '<div class="detail-item"><label>Last Seen</label><span>' + timeAgo(device.last_seen) + '</span></div>'
        + '<div class="detail-item"><label>Fingerprint</label><code style="font-size:11px;word-break:break-all;">' + escapeHTML(device.fingerprint) + '</code></div>'
        + '</div>'
        + '<h4 style="color:var(--text-primary);margin:16px 0 12px;">🖥 Hardware</h4>'
        + '<div style="display:grid;gap:8px;">'
        + '<div class="detail-item"><label>OS</label><span>' + escapeHTML(osInfo) + '</span></div>'
        + '<div class="detail-item"><label>CPU</label><span>' + escapeHTML(cpuInfo) + '</span></div>'
        + '<div class="detail-item"><label>RAM</label><span>' + escapeHTML(ramInfo) + '</span></div>'
        + '<div class="detail-item"><label>Disk</label><span>' + escapeHTML(diskInfo) + '</span></div>'
        + '<div class="detail-item"><label>GPU</label><span>' + escapeHTML(gpuInfo) + '</span></div>'
        + '<div class="detail-item"><label>Battery</label><span>' + escapeHTML(batteryInfo) + '</span></div>'
        + '</div>'
        + scanHistoryHtml
        + eventsHtml
        + '</div>'
        + '<!-- Right Column: Health + License -->'
        + '<div>'
        + vitalsHtml
        + '<h4 style="color:var(--text-primary);margin-bottom:12px;">❤️ Health Score</h4>'
        + '<div style="text-align:center;padding:16px;background:rgba(255,255,255,0.03);border-radius:10px;margin-bottom:12px;">'
        + '<div style="font-size:48px;font-weight:800;color:' + gradeColor + '">' + (h.overall_score || 0) + '%</div>'
        + '<div style="font-size:14px;color:var(--text-muted)">Health Score</div>'
        + '</div>'
        + (componentHtml ? '<div style="margin-bottom:16px;">' + componentHtml + '</div>' : '')
        + '<h4 style="color:var(--text-primary);margin-bottom:12px;"><iconify-icon icon="lucide:key"></iconify-icon> License</h4>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;">'
        + '<div style="padding:10px;background:rgba(59,130,246,0.1);border-radius:8px;">'
        + '<div style="font-size:20px;font-weight:700;color:#3b82f6;">' + device.total_scans + '</div>'
        + '<div style="font-size:11px;color:var(--text-muted)">Total</div></div>'
        + '<div style="padding:10px;background:rgba(234,179,8,0.1);border-radius:8px;">'
        + '<div style="font-size:20px;font-weight:700;color:#eab308;">' + device.scans_used + '</div>'
        + '<div style="font-size:11px;color:var(--text-muted)">Used</div></div>'
        + '<div style="padding:10px;background:rgba(34,197,94,0.1);border-radius:8px;">'
        + '<div style="font-size:20px;font-weight:700;color:#22c55e;">' + ((device.total_scans || 0) - (device.scans_used || 0)) + '</div>'
        + '<div style="font-size:11px;color:var(--text-muted)">Remaining</div></div>'
        + '</div>'
        + '<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;">'
        + '<button class="btn btn-primary btn-sm" onclick="downloadReport(\'' + escapeHTML(device.fingerprint) + '\')"><iconify-icon icon="lucide:file-text"></iconify-icon> Download Report</button>'
        + '<button class="btn btn-success btn-sm" onclick="quickAddScans(\'' + escapeHTML(device.fingerprint) + '\', 10); closeModal();">+10 Scans</button>'
        + '</div>'
        + '</div>'
        + '</div>';
}


function closeModal() { document.getElementById('device-modal').style.display = 'none'; }

// ── Fleet Health Summary ──
async function loadFleetHealth() {
    const container = document.getElementById('fleet-health-container');
    if (!container) return;

    const data = await fetchJSON('/api/dashboard/fleet-health');
    if (!data) { container.innerHTML = '<div class="empty-state">Could not load fleet health.</div>'; return; }

    const g = data.grade_distribution || {};
    const total = data.total_devices || 1;

    const gradeColors = { A: '#22c55e', B: '#84cc16', C: '#eab308', D: '#f97316', F: '#ef4444', '?': '#64748b' };

    // Grade bars
    let barsHtml = '';
    ['A', 'B', 'C', 'D', 'F', '?'].forEach(grade => {
        const count = g[grade] || 0;
        const pct = Math.round((count / total) * 100);
        if (count > 0) {
            barsHtml += `<div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
                <span style="width:20px; font-weight:700; color:${gradeColors[grade]}">${grade}</span>
                <div style="flex:1; height:20px; background:var(--bg); border-radius:4px; overflow:hidden;">
                    <div style="width:${pct}%; height:100%; background:${gradeColors[grade]}; border-radius:4px; transition:width 0.5s;"></div>
                </div>
                <span style="width:50px; font-size:13px; color:var(--text-muted)">${count} (${pct}%)</span>
            </div>`;
        }
    });

    container.innerHTML = `
        <div class="card">
            <div class="card-header"><h3>❤️ Fleet Health Summary</h3></div>
            <div class="card-body">
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-bottom:20px;">
                    <div style="text-align:center; padding:12px; background:rgba(34,197,94,0.1); border-radius:8px;">
                        <div style="font-size:28px; font-weight:800; color:#22c55e;">${data.healthy_count}</div>
                        <div style="font-size:12px; color:var(--text-muted)">Healthy (A/B)</div>
                    </div>
                    <div style="text-align:center; padding:12px; background:rgba(234,179,8,0.1); border-radius:8px;">
                        <div style="font-size:28px; font-weight:800; color:#eab308;">${data.warning_count}</div>
                        <div style="font-size:12px; color:var(--text-muted)">Warning (C)</div>
                    </div>
                    <div style="text-align:center; padding:12px; background:rgba(239,68,68,0.1); border-radius:8px;">
                        <div style="font-size:28px; font-weight:800; color:#ef4444;">${data.critical_count}</div>
                        <div style="font-size:12px; color:var(--text-muted)">Critical (D/F)</div>
                    </div>
                </div>
                <h4 style="margin-bottom:10px; font-size:14px;">Grade Distribution</h4>
                ${barsHtml}
                ${data.replacement_needed && data.replacement_needed.length > 0 ? `
                    <h4 style="margin-top:16px; margin-bottom:8px; font-size:14px; color:#ef4444;"><iconify-icon icon="lucide:alert-triangle"></iconify-icon> Devices Needing Attention</h4>
                    ${data.replacement_needed.map(d => `
                        <div style="padding:8px 12px; background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.2); border-radius:6px; margin-bottom:6px; font-size:13px;">
                            <strong>${escapeHTML(d.hostname)}</strong> (${escapeHTML(d.org_name)})  -  Grade: <span style="color:${gradeColors[d.overall_grade]};font-weight:700">${d.overall_grade}</span>
                            ${d.components.map(c => `<span style="display:inline-block;margin-left:8px;padding:2px 6px;background:rgba(239,68,68,0.1);border-radius:4px;font-size:11px;">${c.component}: ${c.grade}</span>`).join('')}
                        </div>
                    `).join('')}
                ` : (data.warning_count > 0 ? '<p style="color:var(--text-muted); font-size:13px; margin-top:12px;"><iconify-icon icon="lucide:alert-triangle"></iconify-icon> Some devices need attention. Review warnings above.</p>' : '<p style="color:var(--text-muted); font-size:13px; margin-top:12px;"><iconify-icon icon="lucide:check-circle"></iconify-icon> All devices are in good health.</p>')}}
            </div>
        </div>`;
}

// ── Feature Flags Management ──
async function toggleFeature(orgId, featureName, enabled, durationDays) {
    const data = { org_id: orgId, feature_name: featureName, enabled: enabled };
    if (durationDays) data.duration_days = durationDays;
    const result = await postJSON('/api/dashboard/features', data);
    if (result && result.success) {
        showToast(`Feature "${featureName}" ${enabled ? 'enabled' : 'disabled'} for org ${orgId}`, 'success');
    } else {
        showToast('Failed to update feature flag', 'error');
    }
}

async function enableNetworkScan(orgId) {
    const days = prompt('Enter license duration in days (e.g., 60, 365):', '365');
    if (days && !isNaN(days)) {
        await toggleFeature(orgId, 'network-scan', true, parseInt(days));
        loadOrgs();
    }
}

function refreshData() {
    const btn = document.getElementById('refresh-btn');
    const icon = btn ? btn.querySelector('iconify-icon') : null;
    
    if (icon) {
        icon.style.animation = 'spin 1s linear infinite';
    }
    
    const active = document.querySelector('.nav-item.active');
    if (active) switchView(active.dataset.view);
    
    setTimeout(() => {
        if (icon) {
            icon.style.animation = '';
        }
    }, 2000);
}

// Global initialization  -  only load data if already authenticated
window.addEventListener('DOMContentLoaded', () => {
    // Note: initial data load is handled by validateSession() inside checkSession()
    setInterval(() => {
        // Only auto-refresh if logged in and on overview tab
        if (sessionStorage.getItem('catalyst_auth') && document.querySelector('.nav-item.active')?.dataset.view === 'overview') {
            loadOverview();
        }
    }, 30000);

    // Populate global filters for admins/partners
    populateGlobalPartnerFilter();
    populateGlobalOrgFilter();
});

// ── Global Org Filter ──
function applyGlobalPartnerFilter(partnerId) {
    _globalPartnerFilter = partnerId || null;
    _globalOrgFilter = null; // Reset org filter when partner changes
    const orgSel = document.getElementById('global-org-filter');
    if (orgSel) orgSel.value = '';

    const active = document.querySelector('.nav-item.active');
    if (active) switchView(active.dataset.view);
}

function applyGlobalOrgFilter(orgId) {
    _globalOrgFilter = orgId || null;
    // Reload current view with new scope
    const active = document.querySelector('.nav-item.active');
    if (active) switchView(active.dataset.view);
}

async function populateGlobalPartnerFilter() {
    try {
        const auth = JSON.parse(sessionStorage.getItem('catalyst_auth') || '{}');
        const role = auth.role || '';
        const sel = document.getElementById('global-partner-filter');
        if (!sel) return;

        // Only show for super admin
        if (role !== 'super_admin') {
            sel.style.display = 'none';
            return;
        }

        const partners = await fetchJSON('/api/admin/partners');
        if (!partners) return;

        while (sel.options.length > 1) sel.remove(1);

        partners.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            sel.appendChild(opt);
        });

        sel.style.display = '';
    } catch (e) { console.error(e); }
}

async function populateGlobalOrgFilter() {
    try {
        const auth = JSON.parse(sessionStorage.getItem('catalyst_auth') || '{}');
        const role = auth.role || '';
        const sel = document.getElementById('global-org-filter');
        if (!sel) return;

        // Only show for admin and partner roles
        if (role === 'org_user' || role === 'end_customer' || role.startsWith('education_')) {
            sel.style.display = 'none';
            return;
        }

        const data = await fetchJSON('/api/dashboard/orgs');
        if (!data || !data.organizations) return;

        // Clear existing options except "All Organizations"
        while (sel.options.length > 1) sel.remove(1);

        data.organizations.forEach(org => {
            const opt = document.createElement('option');
            opt.value = org.id;
            opt.textContent = org.name || org.id;
            sel.appendChild(opt);
        });

        sel.style.display = '';
    } catch (e) {
        // Silently ignore — dropdown stays hidden
    }
}


// ──────────────────────────────────────────────────
// PHASE 6: E-WASTE COMPLIANCE
// ──────────────────────────────────────────────────

async function loadEwaste() {
    const container = document.getElementById('ewaste-content');
    container.innerHTML = '<p class="loading">Loading e-waste compliance data...</p>';

    const data = await fetchJSON('/api/dashboard/ewaste-report');
    if (!data) { container.innerHTML = '<div class="empty-state">Failed to load e-waste report.</div>'; return; }

    const flagColors = { 'keep': '#22c55e', 'review': '#eab308', 'e-waste': '#ef4444' };
    const flagLabels = { 'keep': 'Keep', 'review': '<iconify-icon icon="lucide:alert-triangle"></iconify-icon> Review', 'e-waste': '🗑 E-Waste' };

    let html = `
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-bottom:20px;">
            <div style="text-align:center; padding:16px; background:rgba(34,197,94,0.1); border-radius:8px;">
                <div style="font-size:32px; font-weight:800; color:#22c55e;">${data.keep}</div>
                <div style="font-size:13px; color:var(--text-muted)">Keep (Good Condition)</div>
            </div>
            <div style="text-align:center; padding:16px; background:rgba(234,179,8,0.1); border-radius:8px;">
                <div style="font-size:32px; font-weight:800; color:#eab308;">${data.review}</div>
                <div style="font-size:13px; color:var(--text-muted)"><iconify-icon icon="lucide:alert-triangle"></iconify-icon> Review Required</div>
            </div>
            <div style="text-align:center; padding:16px; background:rgba(239,68,68,0.1); border-radius:8px;">
                <div style="font-size:32px; font-weight:800; color:#ef4444;">${data.e_waste}</div>
                <div style="font-size:13px; color:var(--text-muted)">🗑 E-Waste Disposal</div>
            </div>
        </div>
        <div style="padding:12px 16px; background:rgba(59,130,246,0.05); border-left:3px solid rgba(59,130,246,0.5); border-radius:4px; font-size:13px; margin-bottom:16px; color:var(--text-muted);">
            <strong> Compliance Note:</strong> ${data.compliance_note}
        </div>
        <table class="data-table"><thead><tr>
            <th>Status</th><th>Hostname</th><th>Organization</th><th>Age (Years)</th><th>Grade</th><th>CPU</th><th>RAM</th><th>Reason</th>
        </tr></thead><tbody>`;

    data.items.forEach(item => {
        let badgeClass = 'badge-success'; // Keep
        if (item.disposal_flag === 'review') badgeClass = 'badge-warning';
        if (item.disposal_flag === 'dispose') badgeClass = 'badge-danger';

        html += `<tr>
            <td><span class="badge ${badgeClass}">${flagLabels[item.disposal_flag]}</span></td>
            <td><strong>${escapeHTML(item.hostname)}</strong></td>
            <td>${escapeHTML(item.org_name)}</td>
            <td>${item.bios_age_years || 'N/A'}</td>
            <td><span class="grade-badge grade-${(item.overall_grade || '?').toUpperCase()}">${item.overall_grade}</span></td>
            <td class="wrap-cell" title="${item.cpu}" style="font-size:12px;">${item.cpu}</td>
            <td>${item.ram_gb} GB</td>
            <td class="wrap-cell" title="${item.reason || ''}" style="font-size:12px; color:var(--text-muted);">${item.reason || ' - '}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}


// ──────────────────────────────────────────────────
// PHASE 6: AMC TRACKER
// ──────────────────────────────────────────────────

async function loadAmc() {
    const container = document.getElementById('amc-content');
    container.innerHTML = '<p class="loading">Loading AMC records...</p>';

    const data = await fetchJSON('/api/dashboard/amc');
    if (!data) { container.innerHTML = '<div class="empty-state">No AMC data available.</div>'; return; }

    const statusColors = { 'active': '#22c55e', 'expiring_soon': '#eab308', 'expired': '#ef4444' };
    const statusLabels = { 'active': 'Active', 'expiring_soon': '<iconify-icon icon="lucide:alert-triangle"></iconify-icon> Expiring Soon', 'expired': '<iconify-icon icon="lucide:x-circle"></iconify-icon> Expired' };

    let html = `
        <div style="display:flex; gap:16px; margin-bottom:16px;">
            <div style="padding:10px 20px; background:rgba(239,68,68,0.1); border-radius:8px; text-align:center;">
                <span style="font-size:20px; font-weight:800; color:#ef4444;">${data.expired}</span>
                <span style="font-size:12px; color:var(--text-muted); margin-left:4px;">Expired</span>
            </div>
            <div style="padding:10px 20px; background:rgba(234,179,8,0.1); border-radius:8px; text-align:center;">
                <span style="font-size:20px; font-weight:800; color:#eab308;">${data.expiring_soon}</span>
                <span style="font-size:12px; color:var(--text-muted); margin-left:4px;">Expiring Soon</span>
            </div>
            <div style="flex:1;"></div>
            <button class="btn btn-primary btn-sm" onclick="showAddAmcForm()"><iconify-icon icon="lucide:plus"></iconify-icon> Add AMC Record</button>
        </div>
    `;

    if (data.records.length > 0) {
        html += `<table class="data-table"><thead><tr>
            <th>Status</th><th>Hostname</th><th>Vendor</th><th>Type</th><th>End Date</th><th>Days Left</th><th>Cost (₹)</th>
        </tr></thead><tbody>`;
        data.records.forEach(r => {
            html += `<tr>
                <td><span style="padding:3px 10px; border-radius:12px; font-size:12px; font-weight:700; background:${statusColors[r.status]}20; color:${statusColors[r.status]}">${statusLabels[r.status]}</span></td>
                <td><strong>${escapeHTML(r.hostname) || truncate(r.fingerprint, 16)}</strong></td>
                <td>${r.vendor_name || ' - '}</td>
                <td>${r.contract_type || ' - '}</td>
                <td>${r.end_date || ' - '}</td>
                <td style="font-weight:700; color:${statusColors[r.status]};">${r.days_remaining != null ? r.days_remaining + ' days' : ' - '}</td>
                <td>₹${r.cost_inr ? r.cost_inr.toLocaleString() : ' - '}</td>
            </tr>`;
        });
        html += '</tbody></table>';
    } else {
        html += '<div class="empty-state"><div class="icon"></div>No AMC/warranty records. Click "Add AMC Record" to start tracking.</div>';
    }

    html += '<div id="amc-form-area"></div>';
    container.innerHTML = html;
}

function showAddAmcForm() {
    const area = document.getElementById('amc-form-area');
    area.innerHTML = `
        <div class="card" style="margin-top:16px; border:1px solid var(--primary);">
            <div class="card-header"><h3><iconify-icon icon="lucide:plus"></iconify-icon> Add AMC/Warranty Record</h3></div>
            <div class="card-body">
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
                    <div class="form-group"><label>Device Fingerprint</label><input id="amc-fp" placeholder="Paste fingerprint"></div>
                    <div class="form-group"><label>Vendor Name</label><input id="amc-vendor" placeholder="e.g. Dell, HP"></div>
                    <div class="form-group"><label>Contract Type</label><select id="amc-type"><option>warranty</option><option>amc</option><option>camc</option></select></div>
                    <div class="form-group"><label>Start Date</label><input id="amc-start" type="date"></div>
                    <div class="form-group"><label>End Date</label><input id="amc-end" type="date"></div>
                    <div class="form-group"><label>Cost (₹)</label><input id="amc-cost" type="number" placeholder="0"></div>
                    <div class="form-group" style="grid-column:span 3;"><label>Notes</label><textarea id="amc-notes" rows="2" placeholder="Optional notes..."></textarea></div>
                </div>
                <button class="btn btn-primary" onclick="submitAmc()"> Save Record</button>
                <button class="btn btn-ghost" onclick="document.getElementById('amc-form-area').innerHTML=''">Cancel</button>
            </div>
        </div>
    `;
}

async function submitAmc() {
    const data = {
        fingerprint: document.getElementById('amc-fp').value,
        vendor_name: document.getElementById('amc-vendor').value,
        contract_type: document.getElementById('amc-type').value,
        start_date: document.getElementById('amc-start').value,
        end_date: document.getElementById('amc-end').value,
        cost_inr: parseFloat(document.getElementById('amc-cost').value) || 0,
        notes: document.getElementById('amc-notes').value,
    };

    const result = await postJSON('/api/dashboard/amc', data);
    if (result && result.success) {
        showToast('AMC record saved!', 'success');
        loadAmc();
    } else {
        showToast('Failed to save AMC record', 'error');
    }
}


// ──────────────────────────────────────────────────
// PHASE 6: REPORTS & EXPORTS
// ──────────────────────────────────────────────────

function loadReportsView() {
    // Compliance reports view is static HTML, nothing to load
    const output = document.getElementById('report-output');
    if (output) output.innerHTML = '';
}

async function loadMgmtReportsView() {
    const sel = document.getElementById('report-org-select');
    if (!sel) return;
    const orgData = await fetchJSON('/api/dashboard/orgs');
    const orgs = (orgData && orgData.organizations) ? orgData.organizations : [];
    sel.innerHTML = '<option value="" disabled selected>Select Organization</option>' +
        orgs.map(o => `<option value="${o.id}">${escapeHTML(o.name)} (${o.id})</option>`).join('');
    const resultDiv = document.getElementById('report-result');
    if (resultDiv) resultDiv.innerHTML = '';
}

async function generateReport() {
    const orgId = document.getElementById('report-org-select').value;
    const reportType = document.getElementById('report-type-select').value;
    const cost = parseInt(document.getElementById('report-cost').value) || 35000;
    const phases = parseInt(document.getElementById('report-phases')?.value) || 3;
    if (!orgId) { showToast('Please select an organization', 'error'); return; }
    const btn = document.getElementById('report-generate-btn');
    const resultDiv = document.getElementById('report-result');
    btn.disabled = true; btn.innerText = 'Generating...';
    resultDiv.innerHTML = '<p style="color:var(--text-muted);">Generating PDF report, please wait...</p>';
    try {
        const auth = sessionStorage.getItem('catalyst_auth');
        let headers = { 'Content-Type': 'application/json' };
        if (auth) { try { headers['Authorization'] = 'Bearer ' + JSON.parse(auth).token; } catch (e) { } }
        const res = await fetch('/api/reports/generate', {
            method: 'POST', headers,
            body: JSON.stringify({ org_id: orgId, report_type: reportType, cost_per_replacement: cost, phase_years: phases })
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'Server error'); }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CatalystScan_${reportType}_${orgId}_${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        resultDiv.innerHTML = '<p style="color:#22c55e;font-weight:600;"><iconify-icon icon="lucide:check-circle"></iconify-icon> Report generated and downloaded!</p>';
        showToast('Report downloaded successfully!', 'success');
    } catch (e) {
        resultDiv.innerHTML = `<p style="color:#ef4444;"><iconify-icon icon="lucide:x-circle"></iconify-icon> Failed: ${e.message}</p>`;
        showToast('Report generation failed: ' + e.message, 'error');
    } finally { btn.disabled = false; btn.innerText = '<iconify-icon icon="lucide:file-text"></iconify-icon> Generate PDF Report'; }
}

async function downloadAssetCSV() {
    try {
        const auth = sessionStorage.getItem('catalyst_auth');
        if (!auth) { showToast('Please log in first.', 'error'); return; }
        let headers = {};
        try { headers['Authorization'] = 'Bearer ' + JSON.parse(auth).token; } catch (e) { }

        // Inject org_id scope if applicable
        let url = '/api/dashboard/export/asset-register/csv';
        const orgScope = getOrgScope();
        if (orgScope) url += '?org_id=' + encodeURIComponent(orgScope);

        const res = await fetch(url, { headers });
        if (!res.ok) {
            if (res.status === 401) { showToast('Session expired. Please log in again.', 'error'); doLogout(); return; }
            const err = await res.json().catch(() => ({}));
            showToast('Download failed: ' + (err.detail || 'Server error ' + res.status), 'error');
            return;
        }
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'AICTE_UGC_Asset_Register.csv';
        a.click();
        URL.revokeObjectURL(a.href);
    } catch (e) {
        console.error('Asset CSV download error:', e);
        showToast('Failed to download: ' + e.message, 'error');
    }
}

async function downloadComponentPartsCSV() {
    try {
        const auth = sessionStorage.getItem('catalyst_auth');
        if (!auth) { showToast('Please log in first.', 'error'); return; }
        let headers = {};
        try { headers['Authorization'] = 'Bearer ' + JSON.parse(auth).token; } catch (e) { }

        // Inject org_id scope if applicable
        let url = '/api/dashboard/export/component-parts/csv';
        const orgScope = getOrgScope();
        if (orgScope) url += '?org_id=' + encodeURIComponent(orgScope);

        const res = await fetch(url, { headers });
        if (!res.ok) {
            if (res.status === 401) { showToast('Session expired. Please log in again.', 'error'); doLogout(); return; }
            const err = await res.json().catch(() => ({}));
            showToast('Download failed: ' + (err.detail || 'Server error ' + res.status), 'error');
            return;
        }
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'Component_Part_Codes.csv';
        a.click();
        URL.revokeObjectURL(a.href);
    } catch (e) {
        console.error('Component Parts CSV download error:', e);
        showToast('Failed to download: ' + e.message, 'error');
    }
}

function downloadEwasteReport() {
    // Switch to e-waste view
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const ewasteNav = document.querySelector('[data-view="ewaste"]');
    if (ewasteNav) ewasteNav.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-ewaste').classList.add('active');
    document.getElementById('page-title').innerText = '♻️ E-Waste';
    loadEwaste();
}

async function viewSoftwareAudit() {
    const output = document.getElementById('report-output');
    output.innerHTML = '<p class="loading">Loading software audit...</p>';

    const data = await fetchJSON('/api/dashboard/software-audit', { suppress404: true });
    if (!data) { output.innerHTML = '<div class="empty-state">No software audit data.</div>'; return; }

    let html = `<div class="card" style="margin-top:16px;">
        <div class="card-header"><h3> Software Inventory (${data.unique_software} unique, ${data.total_devices_scanned} devices)</h3></div>
        <div class="card-body">`;

    if (data.software_inventory.length > 0) {
        html += '<table class="data-table"><thead><tr><th>Software</th><th>Installed On</th><th>Versions</th></tr></thead><tbody>';
        data.software_inventory.forEach(sw => {
            html += `<tr><td><strong>${sw.name}</strong></td><td>${sw.count} devices</td><td style="font-size:12px; color:var(--text-muted);">${sw.versions.join(', ')}</td></tr>`;
        });
        html += '</tbody></table>';
    } else {
        html += '<div class="empty-state">No software data collected. Devices need to be scanned first.</div>';
    }

    html += '</div></div>';
    output.innerHTML = html;
}

function downloadCsvTemplate() {
    const csvContent = "fingerprint,count\nexample_fp_12345,5\nanother_fp_67890,2\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "bulk_license_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function handleCsvUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('bulk-csv').value = e.target.result;
        };
        reader.readAsText(file);
    }
}

function loadBulkLicenseUI() {
    const output = document.getElementById('report-output');
    output.innerHTML = `
        <div class="card" style="margin-top:16px; border:1px solid var(--primary);">
            <div class="card-header"><h3> Bulk License Manager</h3></div>
            <div class="card-body">
                <div style="display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
                    <button class="btn btn-secondary" onclick="downloadCsvTemplate()">⬇️ Download CSV Template</button>
                    <label class="btn btn-secondary" style="cursor:pointer;">
                        ⬆️ Upload CSV File
                        <input type="file" accept=".csv" style="display:none;" onchange="handleCsvUpload(event)">
                    </label>
                </div>
                <p style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">
                    Paste CSV content with fingerprints to add scan credits in bulk.<br>
                    Format: <code>fingerprint,count</code> (one per line). If count is omitted, default credits apply.
                </p>
                <textarea id="bulk-csv" rows="8" style="width:100%; padding:10px; background:var(--bg); border:1px solid var(--border); border-radius:8px; font-family:monospace; font-size:13px; color:var(--text);" placeholder="abc123def456,5&#10;xyz789ghi012,3&#10;..."></textarea>
                <div style="display:flex; gap:12px; margin-top:12px; align-items:center;">
                    <label style="font-size:13px;">Default credits: <input id="bulk-default-count" type="number" value="2" min="1" style="width:60px; padding:4px 8px; background:var(--bg); border:1px solid var(--border); border-radius:4px; color:var(--text);"></label>
                    <button class="btn btn-primary" onclick="submitBulkLicense()"> Process CSV</button>
                </div>
                <div id="bulk-result" style="margin-top:12px;"></div>
            </div>
        </div>
    `;
}

async function submitBulkLicense() {
    const csv = document.getElementById('bulk-csv').value;
    const count = parseInt(document.getElementById('bulk-default-count').value) || 2;
    const resultDiv = document.getElementById('bulk-result');

    resultDiv.innerHTML = '<p class="loading">Processing...</p>';

    const data = await postJSON('/api/dashboard/bulk-license', { csv, count });
    if (data) {
        resultDiv.innerHTML = `
            <div style="padding:12px; background:rgba(34,197,94,0.1); border-radius:8px; font-size:13px;">
                Processed: ${data.processed} | Success: <strong style="color:#22c55e">${data.success}</strong> | Failed: <strong style="color:#ef4444">${data.failed}</strong>
            </div>
            ${data.details.map(d => `<div style="padding:4px 0; font-size:12px; color:var(--text-muted);">${d.fingerprint.substring(0, 16)}... → ${d.status === 'ok' ? '+' + d.added : '<iconify-icon icon="lucide:x-circle"></iconify-icon> ' + d.status}</div>`).join('')}
        `;
    } else {
        resultDiv.innerHTML = '<div style="color:#ef4444;"><iconify-icon icon="lucide:x-circle"></iconify-icon> Failed to process CSV</div>';
    }
}


// ──────────────────────────────────────────────────
// PHASE 7: LAB UTILIZATION
// ──────────────────────────────────────────────────

async function loadLabUtil() {
    const container = document.getElementById('lab-util-content');
    container.innerHTML = '<p class="loading">Analyzing lab utilization...</p>';

    const data = await fetchJSON('/api/dashboard/lab-utilization?days=30');
    if (!data) { container.innerHTML = '<div class="empty-state">Failed to load lab utilization data.</div>'; return; }

    const catColors = { 'high': '#22c55e', 'medium': '#3b82f6', 'low': '#eab308', 'idle': '#ef4444' };
    const catLabels = { 'high': ' High (>60%)', 'medium': ' Medium (20-60%)', 'low': ' Low (5-20%)', 'idle': ' Idle (<5%)' };

    let html = `
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:16px; margin-bottom:20px;">
            <div style="text-align:center; padding:16px; background:rgba(34,197,94,0.1); border-radius:8px;">
                <div style="font-size:28px; font-weight:800; color:#22c55e;">${data.categories.high}</div>
                <div style="font-size:12px; color:var(--text-muted)"> High Use</div>
            </div>
            <div style="text-align:center; padding:16px; background:rgba(59,130,246,0.1); border-radius:8px;">
                <div style="font-size:28px; font-weight:800; color:#3b82f6;">${data.categories.medium}</div>
                <div style="font-size:12px; color:var(--text-muted)"> Medium</div>
            </div>
            <div style="text-align:center; padding:16px; background:rgba(234,179,8,0.1); border-radius:8px;">
                <div style="font-size:28px; font-weight:800; color:#eab308;">${data.categories.low}</div>
                <div style="font-size:12px; color:var(--text-muted)"> Low</div>
            </div>
            <div style="text-align:center; padding:16px; background:rgba(239,68,68,0.1); border-radius:8px;">
                <div style="font-size:28px; font-weight:800; color:#ef4444;">${data.categories.idle}</div>
                <div style="font-size:12px; color:var(--text-muted)"> Idle</div>
            </div>
        </div>
        <div style="display:flex; gap:16px; margin-bottom:16px; align-items:center;">
            <div style="padding:8px 16px; background:var(--card); border:1px solid var(--border); border-radius:8px;">
                <span style="font-size:13px; color:var(--text-muted)">Avg Utilization:</span>
                <strong style="font-size:18px; margin-left:4px; color:${data.avg_utilization_pct > 60 ? '#22c55e' : data.avg_utilization_pct > 30 ? '#eab308' : '#ef4444'};">${data.avg_utilization_pct}%</strong>
            </div>
            <div style="padding:8px 16px; background:var(--card); border:1px solid var(--border); border-radius:8px; font-size:13px;">
                 Period: Last <strong>${data.period_days} days</strong> | ${data.total_devices} devices
            </div>
        </div>
        <div style="padding:10px 14px; background:rgba(59,130,246,0.05); border-left:3px solid rgba(59,130,246,0.5); border-radius:4px; font-size:13px; margin-bottom:16px; color:var(--text-muted);">
            <strong> Recommendation:</strong> ${data.recommendation}
        </div>
        <table class="data-table"><thead><tr>
            <th>Hostname</th><th>Organization</th><th style="width:200px;">Utilization</th><th>Category</th><th>Heartbeats</th><th>Last Seen</th>
        </tr></thead><tbody>`;

    data.devices.forEach(d => {
        const barColor = catColors[d.category];
        html += `<tr>
            <td><strong>${escapeHTML(d.hostname)}</strong></td>
            <td style="font-size:12px;">${escapeHTML(d.org_name)}</td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="flex:1; height:8px; background:var(--border); border-radius:4px; overflow:hidden;">
                        <div style="height:100%; width:${d.utilization_pct}%; background:${barColor}; border-radius:4px;"></div>
                    </div>
                    <span style="font-size:12px; font-weight:700; color:${barColor}; width:40px; text-align:right;">${d.utilization_pct}%</span>
                </div>
            </td>
            <td><span style="padding:3px 10px; border-radius:12px; font-size:11px; font-weight:700; background:${barColor}20; color:${barColor}">${catLabels[d.category]?.split(' ')[0] || '?'}</span></td>
            <td style="font-size:12px;">${(d.heartbeats || d.heartbeat_count || 0).toLocaleString()}</td>
            <td style="font-size:12px; color:var(--text-muted);">${d.last_seen || 'Never'}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}


// ──────────────────────────────────────────────────
// PHASE 7: MULTI-ORG SI VIEW
// ──────────────────────────────────────────────────

async function loadMultiOrg() {
    const container = document.getElementById('multi-org-content');
    container.innerHTML = '<p class="loading">Loading cross-organization data...</p>';

    const data = await fetchJSON('/api/dashboard/multi-org/summary');
    if (!data) { container.innerHTML = '<div class="empty-state">No organization data available.</div>'; return; }

    let html = `
        <div style="display:flex; gap:16px; margin-bottom:20px;">
            <div style="padding:12px 20px; background:rgba(59,130,246,0.1); border-radius:8px; text-align:center;">
                <div style="font-size:24px; font-weight:800; color:#3b82f6;">${data.total_organizations}</div>
                <div style="font-size:12px; color:var(--text-muted)">Organizations</div>
            </div>
            <div style="padding:12px 20px; background:rgba(34,197,94,0.1); border-radius:8px; text-align:center;">
                <div style="font-size:24px; font-weight:800; color:#22c55e;">${data.total_devices}</div>
                <div style="font-size:12px; color:var(--text-muted)">Total Devices</div>
            </div>
            <div style="padding:12px 20px; background:rgba(168,85,247,0.1); border-radius:8px; text-align:center;">
                <div style="font-size:24px; font-weight:800; color:#a855f7;">${data.total_online}</div>
                <div style="font-size:12px; color:var(--text-muted)">Online Now</div>
            </div>
        </div>
    `;

    if (data.organizations.length === 0) {
        html += '<div class="empty-state">No organizations registered yet.</div>';
    } else {
        html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">';
        data.organizations.forEach(org => {
            const healthColor = org.health_score >= 80 ? '#22c55e' : org.health_score >= 60 ? '#eab308' : '#ef4444';
            const grades = org.grade_distribution || {};
            const gradeStr = Object.entries(grades).map(([g, c]) => `<span class="grade-badge grade-${g.toLowerCase()}" style="font-size:11px;">${g}:${c}</span>`).join(' ');

            html += `
                <div style="padding:16px; background:var(--card); border:1px solid var(--border); border-radius:8px; cursor:pointer;" onclick="drillOrg('${escapeHTML(org.org_id)}')">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h4 style="margin:0;">${escapeHTML(org.org_name)}</h4>
                        <span style="font-size:14px; font-weight:800; color:${healthColor};">${org.health_score}/100</span>
                    </div>
                    <div style="display:flex; gap:12px; font-size:12px; color:var(--text-muted); margin-bottom:8px;">
                        <span>¥ ${org.device_count} devices</span>
                        <span> 🟢 ${org.online_count} online</span>
                        <span> 🔴 ${org.offline_count} offline</span>
                    </div>
                    <div style="display:flex; gap:8px; font-size:12px; margin-bottom:8px;">
                        <span> Scans: ${org.scans_used}/${org.total_scans}</span>
                        <span> Remaining: ${org.scans_remaining}</span>
                    </div>
                    <div style="display:flex; gap:4px; flex-wrap:wrap;">${gradeStr || '<span style="font-size:11px; color:var(--text-muted)">No scans yet</span>'}</div>
                </div>
            `;
        });
        html += '</div>';
    }

    html += '<div id="org-drill-content" style="margin-top:16px;"></div>';
    container.innerHTML = html;
}

async function drillOrg(orgId) {
    const container = document.getElementById('org-drill-content');
    container.innerHTML = '<p class="loading">Loading organization details...</p>';

    const data = await fetchJSON(`/api/dashboard/multi-org/${orgId}/detail`);
    if (!data) { container.innerHTML = ''; return; }

    let html = `<div class="card" style="border:1px solid var(--primary);">
        <div class="card-header"><h3> ${orgId}  -  Device Details</h3></div>
        <div class="card-body">
            <table class="data-table"><thead><tr>
                <th>Hostname</th><th>Status</th><th>Grade</th><th>Scans Left</th><th>Last Seen</th>
            </tr></thead><tbody>`;

    data.devices.forEach(d => {
        html += `<tr>
            <td><strong>${escapeHTML(d.hostname)}</strong></td>
            <td>${d.online ? '<span style="color:#22c55e"> 🟢 <span class="dot dot-green"></span> Online</span>' : '<span style="color:#ef4444"> 🔴 <span class="dot dot-red"></span> Offline</span>'}</td>
            <td><span class="grade-badge grade-${(d.overall_grade || '?').toLowerCase()}">${d.overall_grade}</span></td>
            <td>${d.scans_remaining}</td>
            <td style="font-size:12px; color:var(--text-muted);">${d.last_seen || 'Never'}</td>
        </tr>`;
    });
    html += '</tbody></table></div></div>';
    container.innerHTML = html;
}


// ──────────────────────────────────────────────────
// PHASE 7: ALERT CONFIGURATION
// ──────────────────────────────────────────────────

async function loadAlertConfig() {
    const container = document.getElementById('alert-config-content');
    container.innerHTML = '<p class="loading">Loading alert configuration...</p>';

    // Get list of orgs to show config options
    const orgsData = await fetchJSON('/api/dashboard/multi-org/summary');
    const orgs = orgsData?.organizations || [];

    let html = `
        <div style="margin-bottom:16px;">
            <label style="font-size:13px; color:var(--text-muted); margin-right:8px;">Select Organization:</label>
            <select id="alert-org-select" onchange="loadOrgAlertConfig()" style="padding:6px 12px; background:var(--bg); border:1px solid var(--border); border-radius:6px; color:var(--text); min-width:200px;">
                <option value="">-- Select --</option>
                ${orgs.map(o => `<option value="${escapeHTML(o.org_id)}">${escapeHTML(o.org_name)}</option>`).join('')}
            </select>
        </div>
        <div id="alert-config-form"></div>
    `;
    container.innerHTML = html;
}

async function loadOrgAlertConfig() {
    const orgId = document.getElementById('alert-org-select').value;
    const form = document.getElementById('alert-config-form');
    if (!orgId) { form.innerHTML = ''; return; }

    form.innerHTML = '<p class="loading">Loading config...</p>';
    let config = await fetchJSON(`/api/dashboard/alert-config/${orgId}`, { suppress404: true });
    if (!config) config = {};

    form.innerHTML = `
        <div class="card" style="border:1px solid var(--border);">
            <div class="card-body">
                <h4 style="margin-bottom:16px;"> Notification Channels</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-bottom:20px;">
                    <div style="padding:16px; background:rgba(59,130,246,0.05); border:1px solid rgba(59,130,246,0.2); border-radius:8px;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                            <input type="checkbox" id="alert-email-on" ${config.email_enabled ? 'checked' : ''}>
                            <h4 style="margin:0;"> Email</h4>
                        </div>
                        <input id="alert-email" value="${config.email_recipients || ''}" placeholder="admin@college.edu" style="width:100%; padding:6px; background:var(--bg); border:1px solid var(--border); border-radius:4px; color:var(--text);">
                    </div>
                    <div style="padding:16px; background:rgba(34,197,94,0.05); border:1px solid rgba(34,197,94,0.2); border-radius:8px;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                            <input type="checkbox" id="alert-webhook-on" ${config.webhook_enabled ? 'checked' : ''}>
                            <h4 style="margin:0;"> 🔗 Webhook</h4>
                        </div>
                        <input id="alert-webhook" value="${config.webhook_url || ''}" placeholder="https://hooks.slack.com/..." style="width:100%; padding:6px; background:var(--bg); border:1px solid var(--border); border-radius:4px; color:var(--text);">
                    </div>
                    <div style="padding:16px; background:rgba(34,197,94,0.05); border:1px solid rgba(34,197,94,0.2); border-radius:8px;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                            <input type="checkbox" id="alert-whatsapp-on" ${config.whatsapp_enabled ? 'checked' : ''}>
                            <h4 style="margin:0;"> WhatsApp</h4>
                        </div>
                        <input id="alert-whatsapp" value="${config.whatsapp_numbers || ''}" placeholder="+91 98765 43210" style="width:100%; padding:6px; background:var(--bg); border:1px solid var(--border); border-radius:4px; color:var(--text);">
                    </div>
                </div>
                
                <h4 style="margin-bottom:12px;"> Alert Triggers</h4>
                <div style="display:flex; gap:20px; flex-wrap:wrap; margin-bottom:16px;">
                    <label style="font-size:13px; display:flex; align-items:center; gap:6px;"><input type="checkbox" id="alert-tamper" ${config.alert_on_tamper ? 'checked' : ''}> <iconify-icon icon="lucide:shield"></iconify-icon> Tamper/Theft</label>
                    <label style="font-size:13px; display:flex; align-items:center; gap:6px;"><input type="checkbox" id="alert-offline" ${config.alert_on_offline ? 'checked' : ''}> 🔴 Device Offline</label>
                    <label style="font-size:13px; display:flex; align-items:center; gap:6px;"><input type="checkbox" id="alert-grade" ${config.alert_on_grade_drop ? 'checked' : ''}> 📉 Grade Drop</label>
                    <label style="font-size:13px; display:flex; align-items:center; gap:6px;"><input type="checkbox" id="alert-amc" ${config.alert_on_amc_expiry ? 'checked' : ''}> ⏳ AMC Expiry</label>
                </div>
                
                <div style="display:flex; gap:12px;">
                    <button class="btn btn-primary" onclick="saveAlertConfig('${orgId}')"> Save Configuration</button>
                    <button class="btn btn-outline" onclick="testAlert('${orgId}', 'webhook')"> Test Webhook</button>
                    <button class="btn btn-outline" onclick="testAlert('${orgId}', 'email')"> Test Email</button>
                </div>
                <div id="alert-save-result" style="margin-top:12px;"></div>
            </div>
        </div>
    `;
}

async function saveAlertConfig(orgId) {
    const data = {
        org_id: orgId,
        email_enabled: document.getElementById('alert-email-on').checked ? 1 : 0,
        email_recipients: document.getElementById('alert-email').value,
        webhook_enabled: document.getElementById('alert-webhook-on').checked ? 1 : 0,
        webhook_url: document.getElementById('alert-webhook').value,
        whatsapp_enabled: document.getElementById('alert-whatsapp-on').checked ? 1 : 0,
        whatsapp_numbers: document.getElementById('alert-whatsapp').value,
        alert_on_tamper: document.getElementById('alert-tamper').checked ? 1 : 0,
        alert_on_offline: document.getElementById('alert-offline').checked ? 1 : 0,
        alert_on_grade_drop: document.getElementById('alert-grade').checked ? 1 : 0,
        alert_on_amc_expiry: document.getElementById('alert-amc').checked ? 1 : 0,
    };

    const result = await postJSON('/api/dashboard/alert-config', data);
    const el = document.getElementById('alert-save-result');
    if (result?.success) {
        el.innerHTML = '<div style="padding:8px 14px; background:rgba(34,197,94,0.1); border-radius:6px; color:#22c55e; font-size:13px;">Configuration saved!</div>';
    } else {
        el.innerHTML = '<div style="padding:8px 14px; background:rgba(239,68,68,0.1); border-radius:6px; color:#ef4444; font-size:13px;"><iconify-icon icon="lucide:x-circle"></iconify-icon> Failed to save</div>';
    }
}

async function testAlert(orgId, channel) {
    const el = document.getElementById('alert-save-result');
    el.innerHTML = '<p class="loading">Sending test alert...</p>';

    const result = await postJSON('/api/dashboard/send-test-alert', { org_id: orgId, channel });
    if (result?.success) {
        el.innerHTML = `<div style="padding:8px 14px; background:rgba(34,197,94,0.1); border-radius:6px; color:#22c55e; font-size:13px;">${result.message}</div>`;
    } else {
        el.innerHTML = `<div style="padding:8px 14px; background:rgba(234,179,8,0.1); border-radius:6px; color:#eab308; font-size:13px;"><iconify-icon icon="lucide:alert-triangle"></iconify-icon> ${result?.message || 'Test failed'}</div>`;
    }
}

// ──────────────────────────────────────────────────
// GLOBAL SEARCH LOGIC
// ──────────────────────────────────────────────────
function handleGlobalSearch(term) {
    const searchTerm = term.toLowerCase();
    const activeView = document.querySelector('.view.active');
    if (!activeView) return;

    // Find all rows in all tbodys inside the active view
    const rows = activeView.querySelectorAll('.data-table tbody tr');
    rows.forEach(row => {
        if (row.querySelector('.loading')) return;

        const rowText = row.innerText.toLowerCase();
        if (rowText.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}


// ──────────────────────────────────────────────────
// PHASE 8: PARTNER MANAGEMENT (Super Admin)
// ──────────────────────────────────────────────────

async function loadPartners() {
    const container = document.getElementById('partners-content');
    if (!container) return;
    container.innerHTML = '<p class="loading">Loading partners...</p>';

    const data = await fetchJSON('/api/admin/partners');
    if (!data || !Array.isArray(data)) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">No partners found. Click <strong>+ New Partner</strong> to create one.</p>';
        return;
    }

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Contact</th>
                    <th>Orgs</th>
                    <th>Devices</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(p => `
                    <tr>
                        <td><strong>${escapeHTML(p.name)}</strong></td>
                        <td><span class="badge">${escapeHTML(p.code)}</span></td>
                        <td>${escapeHTML(p.contact_email) || p.contact_phone || ' - '}</td>
                        <td>${p.org_count || 0}</td>
                        <td>${p.device_count || 0}</td>
                        <td>${p.is_active ? '<span style="color:#22c55e"><iconify-icon icon="lucide:check-circle"></iconify-icon> Active</span>' : '<span style="color:#ef4444"><iconify-icon icon="lucide:x-circle"></iconify-icon> Inactive</span>'}</td>
                        <td>
                            <button class="btn btn-sm" onclick="viewPartnerDetail(${p.id})"> Detail</button>
                            <button class="btn btn-sm btn-danger" onclick="deletePartnerAction(${p.id}, '${escapeHTML(p.name)}')">🗑</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function viewPartnerDetail(partnerId) {
    const container = document.getElementById('partners-content');
    container.innerHTML = '<p class="loading">Loading partner details...</p>';

    const p = await fetchJSON(`/api/admin/partners/${partnerId}`);
    if (!p) { container.innerHTML = '<p style="color:red">Partner not found</p>'; return; }

    const allOrgsResp = await fetchJSON('/api/dashboard/multi-org/summary');
    const assignedOrgIds = new Set((p.orgs || []).map(o => o.id));
    const allOrgsList = (allOrgsResp && allOrgsResp.organizations) ? allOrgsResp.organizations : [];
    const unassignedOrgs = allOrgsList.filter(o => !assignedOrgIds.has(o.org_id));

    container.innerHTML = `
        <div style="margin-bottom:16px;">
            <button class="btn btn-ghost" onclick="loadPartners()"><iconify-icon icon="lucide:arrow-left"></iconify-icon> Back to Partners</button>
        </div>
        <div class="stat-grid" style="margin-bottom:20px;">
            <div class="stat-card"><div class="stat-value">${p.stats?.total_orgs || 0}</div><div class="stat-label">Organizations</div></div>
            <div class="stat-card"><div class="stat-value">${p.stats?.total_devices || 0}</div><div class="stat-label">Total Devices</div></div>
            <div class="stat-card"><div class="stat-value">${p.stats?.online || 0}</div><div class="stat-label">Online</div></div>
            <div class="stat-card"><div class="stat-value">${p.stats?.alerts || 0}</div><div class="stat-label">Alerts</div></div>
        </div>
        <h4 style="margin-bottom:12px;">Partner Info</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
            <div><strong>Name:</strong> ${escapeHTML(p.name)}</div>
            <div><strong>Code:</strong> ${escapeHTML(p.code)}</div>
            <div><strong>Contact:</strong> ${p.contact_name || ' - '}</div>
            <div><strong>Email:</strong> ${escapeHTML(p.contact_email) || ' - '}</div>
            <div><strong>Phone:</strong> ${escapeHTML(p.contact_phone) || ' - '}</div>
        </div>
        <h4 style="margin-bottom:12px;">Assigned Organizations</h4>
        ${(p.orgs && p.orgs.length > 0) ? `
            <table class="data-table" style="margin-bottom:16px;">
                <thead><tr><th>Org Name</th><th>Devices</th><th>Action</th></tr></thead>
                <tbody>
                    ${p.orgs.map(o => `
                        <tr>
                            <td>${escapeHTML(o.name)}</td>
                            <td>${o.device_count || 0}</td>
                            <td><button class="btn btn-sm btn-danger" onclick="unassignOrgAction(${partnerId}, '${o.id}')">Remove</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p style="color:var(--text-muted);margin-bottom:16px;">No organizations assigned yet.</p>'}
        ${unassignedOrgs.length > 0 ? `
            <div style="display:flex;gap:8px;align-items:center;">
                <select id="assign-org-select" class="form-control" style="max-width:300px;">
                    ${unassignedOrgs.map(o => `<option value="${escapeHTML(o.org_id)}">${escapeHTML(o.org_name)} (${o.device_count} devices)</option>`).join('')}
                </select>
                <button class="btn btn-primary" onclick="assignOrgAction(${partnerId})">Assign Org</button>
            </div>
        ` : ''}
    `;
}

async function assignOrgAction(partnerId) {
    const orgId = document.getElementById('assign-org-select')?.value;
    if (!orgId) return;
    await postJSON(`/api/admin/partners/${partnerId}/assign-org`, { org_id: orgId });
    viewPartnerDetail(partnerId);
}

async function unassignOrgAction(partnerId, orgId) {
    if (!confirm('Remove this organization from the partner?')) return;
    await postJSON(`/api/admin/partners/${partnerId}/unassign-org`, { org_id: orgId });
    viewPartnerDetail(partnerId);
}

async function deletePartnerAction(partnerId, name) {
    if (!confirm(`Delete partner "${name}"? This will unlink all organizations.`)) return;
    const auth = sessionStorage.getItem('catalyst_auth');
    const headers = { 'Content-Type': 'application/json' };
    if (auth) headers['Authorization'] = 'Bearer ' + JSON.parse(auth).token;
    await fetch(`/api/admin/partners/${partnerId}`, { method: 'DELETE', headers });
    loadPartners();
}

function showCreatePartnerModal() {
    const container = document.getElementById('partners-content');
    container.innerHTML = `
        <div style="margin-bottom:16px;">
            <button class="btn btn-ghost" onclick="loadPartners()"><iconify-icon icon="lucide:arrow-left"></iconify-icon> Back to Partners</button>
        </div>
        <h4 style="margin-bottom:16px;">Create New Partner</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:600px;">
            <div class="login-field"><label>Partner Name *</label><input type="text" id="cp-name" placeholder="e.g. TechReseller India"></div>
            <div class="login-field"><label>Partner Code *</label><input type="text" id="cp-code" placeholder="e.g. TRIND" maxlength="20"></div>
            <div class="login-field"><label>Contact Name</label><input type="text" id="cp-contact-name" placeholder="John Doe"></div>
            <div class="login-field"><label>Contact Email</label><input type="email" id="cp-email" placeholder="john@example.com"></div>
            <div class="login-field"><label>Contact Phone</label><input type="text" id="cp-phone" placeholder="+91..."></div>
            <div class="login-field"><label>Address</label><input type="text" id="cp-address" placeholder="City, State"></div>
        </div>
        <div style="margin-top:16px;">
            <button class="btn btn-primary" onclick="submitCreatePartner()">  Create Partner</button>
        </div>
        <div id="cp-result" style="margin-top:12px;"></div>
    `;
}

async function submitCreatePartner() {
    const name = document.getElementById('cp-name').value.trim();
    const code = document.getElementById('cp-code').value.trim();
    if (!name || !code) { showToast('Name and Code are required', 'error'); return; }
    const result = await postJSON('/api/admin/partners', {
        name, code,
        contact_name: document.getElementById('cp-contact-name').value.trim() || null,
        contact_email: document.getElementById('cp-email').value.trim() || null,
        contact_phone: document.getElementById('cp-phone').value.trim() || null,
        address: document.getElementById('cp-address').value.trim() || null,
    });
    if (result?.id) {
        document.getElementById('cp-result').innerHTML = '<div style="color:#22c55e;">Partner created successfully!</div>';
        setTimeout(() => loadPartners(), 1000);
    } else {
        document.getElementById('cp-result').innerHTML = '<div style="color:#ef4444;"><iconify-icon icon="lucide:x-circle"></iconify-icon> Failed: Partner code may already exist.</div>';
    }
}


// ──────────────────────────────────────────────────
// PHASE 9: USER MANAGEMENT (Super Admin)
// ──────────────────────────────────────────────────

async function loadUsers() {
    const container = document.getElementById('users-content');
    if (!container) return;
    container.innerHTML = '<p class="loading">Loading users...</p>';

    const data = await fetchJSON('/api/admin/users');
    if (!data || !Array.isArray(data)) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">No users found.</p>';
        return;
    }

    const roleColors = { super_admin: '#6366f1', partner: '#10b981', org_user: '#f59e0b' };
    const roleLabels = { super_admin: 'Super Admin', partner: 'Partner', org_user: 'Org User' };

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Display Name</th>
                    <th>Password</th>
                    <th>Role</th>
                    <th>Partner</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(u => `
                    <tr>
                        <td><strong>${escapeHTML(u.username)}</strong></td>
                        <td>${escapeHTML(u.display_name)}</td>
                        <td><span style="letter-spacing:2px;color:var(--text-muted);font-size:16px;">••••••</span></td>
                        <td><span class="badge" style="background:${roleColors[u.role] || '#64748b'}">${roleLabels[u.role] || u.role}</span></td>
                        <td>${u.partner_name || ' - '}</td>
                        <td>${u.is_active ? '<span style="color:#22c55e"><iconify-icon icon="lucide:check-circle"></iconify-icon> Active</span>' : '<span style="color:#ef4444"><iconify-icon icon="lucide:x-circle"></iconify-icon> Inactive</span>'}</td>
                        <td>${u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
                        <td style="white-space:nowrap;">
                            <button class="btn btn-sm btn-ghost btn-icon" onclick="showResetPasswordModal(${u.id}, '${escapeHTML(u.username)}')" title="Reset Password"><iconify-icon icon="lucide:key"></iconify-icon> Reset</button>
                            <button class="btn btn-sm btn-danger btn-icon" onclick="deleteUserAction(${u.id}, '${escapeHTML(u.username)}')" title="Delete User">🗑️ Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function deleteUserAction(userId, username) {
    if (!confirm(`Are you sure you want to delete user "${escapeHTML(username)}"? This action cannot be undone.`)) return;
    const auth = sessionStorage.getItem('catalyst_auth');
    const headers = { 'Content-Type': 'application/json' };
    if (auth) headers['Authorization'] = 'Bearer ' + JSON.parse(auth).token;
    await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers });
    loadUsers();
}

function showResetPasswordModal(userId, username) {
    const newPass = prompt('Set new password for "' + username + '":\n(Minimum 6 characters)');
    if (!newPass) return;
    if (newPass.length < 6) { showToast('Password must be at least 6 characters.', 'error'); return; }
    resetUserPassword(userId, username, newPass);
}

async function resetUserPassword(userId, username, newPassword) {
    const result = await postJSON('/api/admin/users/' + userId + '/reset-password', { new_password: newPassword });
    if (result && result.success) {
        showToast('<iconify-icon icon="lucide:check-circle"></iconify-icon> Password for "' + username + '" has been reset successfully.', 'success');
    } else {
        showToast('Failed to reset password for "' + username + '".', 'error');
    }
}

function showCreateUserModal() {
    const container = document.getElementById('users-content');
    container.innerHTML = `
        <div style="margin-bottom:16px;">
            <button class="btn btn-ghost" onclick="loadUsers()">â† Back to Users</button>
        </div>
        <h4 style="margin-bottom:16px;">Create New User</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:600px;">
            <div class="login-field"><label>Username *</label><input type="text" id="cu-username" placeholder="e.g. techpartner1"></div>
            <div class="login-field"><label>Password *</label><input type="password" id="cu-password" placeholder="Min 6 characters"></div>
            <div class="login-field"><label>Display Name *</label><input type="text" id="cu-displayname" placeholder="e.g. Tech Partner Admin"></div>
            <div class="login-field">
                <label>Role *</label>
                <select id="cu-role" class="form-control" onchange="onUserRoleChange()">
                    <option value="super_admin">Super Admin</option>
                    <option value="partner" selected>Partner</option>
                    <option value="org_user">Org User</option>
                    <option value="end_customer">End Customer</option>
                    <option value="education_hod">Education HOD</option>
                    <option value="education_it_head">Education IT Head</option>
                    <option value="education_dean">Education Dean</option>
                    <option value="education_vc">Education VC</option>
                </select>
            </div>
            <div class="login-field" id="cu-partner-field">
                <label>Partner</label>
                <select id="cu-partner-id" class="form-control">
                    <option value=""> -  Loading partners...  - </option>
                </select>
            </div>
            <div class="login-field" id="cu-org-field" style="display:none;">
                <label>Organization *</label>
                <select id="cu-org-id" class="form-control">
                    <option value=""> -  Loading orgs...  - </option>
                </select>
            </div>
        </div>
        <div style="margin-top:16px;">
            <button class="btn btn-primary" onclick="submitCreateUser()"> Create User</button>
        </div>
        <div id="cu-result" style="margin-top:12px;"></div>
    `;
    // Load partners for dropdown
    fetchJSON('/api/admin/partners').then(partners => {
        const sel = document.getElementById('cu-partner-id');
        const partnersList = (partners && partners.partners) ? partners.partners : (Array.isArray(partners) ? partners : []);
        if (sel && partnersList.length > 0) {
            sel.innerHTML = '<option value=""> -  None  - </option>' + partnersList.map(p => `<option value="${p.id}">${escapeHTML(p.name)} (${escapeHTML(p.code)})</option>`).join('');
        }
    });
    // Load orgs for dropdown
    fetchJSON('/api/dashboard/multi-org/summary').then(resp => {
        const sel = document.getElementById('cu-org-id');
        const orgs = (resp && resp.organizations) ? resp.organizations : [];
        if (sel) {
            sel.innerHTML = '<option value=""> -  Select Organization  - </option>' + orgs.map(o => `<option value="${escapeHTML(o.org_id)}">${escapeHTML(o.org_name)} (${o.device_count} devices)</option>`).join('');
        }
    });
    onUserRoleChange();
}

function onUserRoleChange() {
    const role = document.getElementById('cu-role')?.value;
    const partnerField = document.getElementById('cu-partner-field');
    const orgField = document.getElementById('cu-org-field');
    if (partnerField) partnerField.style.display = (role === 'partner') ? '' : 'none';
    if (orgField) orgField.style.display = (role === 'org_user' || role === 'end_customer' || role.startsWith('education_')) ? '' : 'none';
}

async function submitCreateUser() {
    const username = document.getElementById('cu-username').value.trim();
    const password = document.getElementById('cu-password').value;
    const displayName = document.getElementById('cu-displayname').value.trim();
    const role = document.getElementById('cu-role').value;
    if (!username || !password || !displayName) { alert('Username, password, and display name are required'); return; }
    const partnerId = document.getElementById('cu-partner-id')?.value || null;
    const orgId = document.getElementById('cu-org-id')?.value || null;
    const result = await postJSON('/api/admin/users', {
        username, password,
        display_name: displayName,
        role,
        partner_id: partnerId ? parseInt(partnerId) : null,
        org_id: orgId || null,
    });
    if (result?.id) {
        document.getElementById('cu-result').innerHTML = '<div style="color:#22c55e;">User created successfully!</div>';
        setTimeout(() => loadUsers(), 1000);
    } else {
        document.getElementById('cu-result').innerHTML = '<div style="color:#ef4444;">âŒ Failed: Username may already exist.</div>';
    }
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PHASE 10: PARTNER DOWNLOADS VIEW
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

async function loadPartnerDownloads() {
    const container = document.getElementById('partner-downloads-content');
    if (!container) return;
    container.innerHTML = '<p class="loading">Loading downloads...</p>';

    const builds = await fetchJSON('/api/partner/downloads');
    if (!builds || builds.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
                <div style="font-size:3rem;margin-bottom:16px;"></div>
                <p>No packages available yet.</p>
                <p>Contact your administrator to build a package for your organization.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = builds.map(b => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid var(--border);margin-bottom:10px;">
            <div>
                <strong style="color:var(--text-primary);"> ${b.filename}</strong>
                <div style="color:var(--text-muted);font-size:0.85rem;margin-top:4px;">
                    ${b.size_mb} MB Â· ${new Date(b.created).toLocaleDateString()}
                </div>
            </div>
            <a href="/api/public/download/${b.filename}" class="btn btn-primary" download style="text-decoration:none;">
                â¬‡ Download
            </a>
        </div>
    `).join('');
}

// Site Settings (Grievance Officer, Platform Config)
async function loadSiteSettings() {
    const container = document.getElementById('view-site-settings');
    if (!container) return;
    container.innerHTML = '<p class="loading">Loading site settings...</p>';
    const data = await fetchJSON('/api/admin/site-settings');
    const get = function (key, fallback) { return data && data[key] ? data[key].setting_value : (fallback || ''); };
    container.innerHTML = '<div class="card" style="margin-bottom:20px;">'
        + '<div class="card-header"><h3>Grievance Officer (DPDPA Section 13)</h3></div>'
        + '<div class="card-body">'
        + '<p style="font-size:13px; color:var(--text-muted); margin-bottom:16px;">Configure the designated Grievance Officer details. These are displayed on the <a href="/privacy" target="_blank" style="color:var(--primary);">Privacy Notice</a> page.</p>'
        + '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; max-width:600px;">'
        + '<div><label style="font-size:12px; color:var(--text-muted);">Officer Name</label><input id="ss-go-name" class="input" value="' + escapeHTML(get('grievance_officer_name')) + '" placeholder="e.g. John Doe"></div>'
        + '<div><label style="font-size:12px; color:var(--text-muted);">Officer Email</label><input id="ss-go-email" class="input" value="' + escapeHTML(get('grievance_officer_email')) + '" placeholder="privacy@yourorg.in"></div>'
        + '<div><label style="font-size:12px; color:var(--text-muted);">Officer Phone</label><input id="ss-go-phone" class="input" value="' + escapeHTML(get('grievance_officer_phone')) + '" placeholder="+91-XXXXXXXXXX"></div>'
        + '<div><label style="font-size:12px; color:var(--text-muted);">Response SLA</label><input id="ss-go-sla" class="input" value="' + escapeHTML(get('grievance_response_sla', '72 hours')) + '" placeholder="72 hours"></div>'
        + '</div>'
        + '<button class="btn btn-primary" style="margin-top:16px;" onclick="saveSiteSettings()">Save Settings</button>'
        + '<span id="ss-save-status" style="margin-left:12px; font-size:13px;"></span>'
        + '</div></div>'
        + '<div class="card"><div class="card-header"><h3>Audit Log (Recent)</h3></div>'
        + '<div class="card-body" id="ss-audit-log"><p class="loading">Loading audit log...</p></div></div>';
    var auditData = await fetchJSON('/api/admin/audit-log');
    var auditEl = document.getElementById('ss-audit-log');
    if (auditData && auditData.logs && auditData.logs.length > 0) {
        auditEl.innerHTML = '<table class="data-table" style="font-size:12px;"><thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Target</th><th>Details</th></tr></thead><tbody>'
            + auditData.logs.slice(0, 25).map(function (l) { return '<tr><td>' + (l.timestamp || '-') + '</td><td>' + escapeHTML(l.username || '-') + '</td><td><code>' + escapeHTML(l.action) + '</code></td><td>' + escapeHTML(l.target_type || '') + ' ' + escapeHTML(l.target_id || '') + '</td><td>' + escapeHTML(l.details || '-') + '</td></tr>'; }).join('')
            + '</tbody></table>';
    } else {
        auditEl.innerHTML = '<p style="color:var(--text-muted);">No audit log entries yet.</p>';
    }
}

async function saveSiteSettings() {
    var statusEl = document.getElementById('ss-save-status');
    statusEl.textContent = 'Saving...';
    statusEl.style.color = 'var(--text-muted)';
    var payload = {
        grievance_officer_name: document.getElementById('ss-go-name').value,
        grievance_officer_email: document.getElementById('ss-go-email').value,
        grievance_officer_phone: document.getElementById('ss-go-phone').value,
        grievance_response_sla: document.getElementById('ss-go-sla').value,
    };
    var result = await postJSON('/api/admin/site-settings', payload, 'PUT');
    if (result && result.success) {
        statusEl.textContent = 'Settings saved!';
        statusEl.style.color = '#22c55e';
    } else {
        statusEl.textContent = 'Failed to save.';
        statusEl.style.color = '#ef4444';
    }
}

// -- Device Comparison --
var selectedDevices = [];

function toggleDeviceSelect(fingerprint, checkbox) {
    if (checkbox.checked) {
        if (selectedDevices.length >= 3) {
            checkbox.checked = false;
            alert('You can compare up to 3 devices at a time.');
            return;
        }
        selectedDevices.push(fingerprint);
    } else {
        selectedDevices = selectedDevices.filter(function (f) { return f !== fingerprint; });
    }
    var compareBtn = document.getElementById('compare-btn');
    if (compareBtn) {
        compareBtn.style.display = selectedDevices.length >= 2 ? 'inline-flex' : 'none';
        compareBtn.textContent = 'Compare (' + selectedDevices.length + ')';
    }
}

async function compareDevices() {
    if (selectedDevices.length < 2) return;
    var devices = [];
    for (var fp of selectedDevices) {
        var data = await fetchJSON('/api/dashboard/device/' + fp + '/health', { suppress404: true });
        var detail = await fetchJSON('/api/dashboard/device/' + fp);
        if (data && detail) {
            devices.push({ ...data, ...detail.device, scan: detail.latest_scan });
        }
    }
    if (devices.length < 2) { alert('Could not load device data.'); return; }

    var html = '<div class="modal" onclick="if(event.target===this)this.remove()">';
    html += '<div class="modal-content" style="max-width:900px; max-height:90vh; overflow-y:auto; padding:30px;">';
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">';
    html += '<h2 style="font-size:20px; font-weight:700;">Device Comparison</h2>';
    html += '<button class="btn btn-ghost" onclick="this.closest(\'.modal\').remove()">Close</button></div>';
    html += '<table style="width:100%; border-collapse:collapse; font-size:13px;">';

    // Header row with device names
    html += '<tr style="background:var(--bg-primary);"><th style="padding:12px; text-align:left; border-bottom:2px solid var(--border);">Spec</th>';
    devices.forEach(function (d) {
        html += '<th style="padding:12px; text-align:center; border-bottom:2px solid var(--border); font-weight:700;">' + escapeHTML(d.hostname || d.fingerprint) + '</th>';
    });
    html += '</tr>';

    // Comparison rows
    var rows = [
        ['Health Grade', function (d) { return '<span class="grade-badge grade-' + (d.overall_grade || '?').toLowerCase() + '">' + (d.overall_grade || '?') + ' (' + (d.overall_score || 0) + ')</span>'; }],
        ['CPU', function (d) { return escapeHTML(d.system_summary?.cpu || d.scan?.scan_data?.cpu?.brand || '-'); }],
        ['RAM', function (d) { return (d.system_summary?.ram_gb || d.scan?.scan_data?.ram?.total_gb || '-') + ' GB'; }],
        ['Storage', function (d) { return escapeHTML(d.system_summary?.primary_disk || '-'); }],
        ['OS', function (d) { return escapeHTML(d.system_summary?.os || d.scan?.scan_data?.os?.os_name || '-'); }],
        ['Organization', function (d) { return escapeHTML(d.org_name || '-'); }],
        ['Scans Used', function (d) { return d.scans_used + '/' + d.total_scans; }],
        ['Scans Remaining', function (d) { return '<span style="color:' + (d.scans_remaining > 0 ? '#16a34a' : '#ef4444') + '; font-weight:700;">' + d.scans_remaining + '</span>'; }],
        ['Status', function (d) { return d.online ? '<span class="dot dot-green"></span> Online' : '<span class="dot dot-red"></span> Offline'; }],
        ['Last Seen', function (d) { return timeAgo(d.last_seen); }],
    ];

    rows.forEach(function (row, i) {
        html += '<tr style="' + (i % 2 ? 'background:var(--bg-primary);' : '') + '">';
        html += '<td style="padding:10px 12px; font-weight:600; color:var(--text-secondary); border-bottom:1px solid var(--border);">' + row[0] + '</td>';
        devices.forEach(function (d) {
            html += '<td style="padding:10px 12px; text-align:center; border-bottom:1px solid var(--border);">' + row[1](d) + '</td>';
        });
        html += '</tr>';
    });

    html += '</table></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    selectedDevices = [];
    document.querySelectorAll('.device-checkbox').forEach(function (cb) { cb.checked = false; });
    var compareBtn = document.getElementById('compare-btn');
    if (compareBtn) compareBtn.style.display = 'none';
}


// -- Batch Operations --
function getSelectedFingerprints() {
    var checked = document.querySelectorAll('.device-checkbox:checked');
    return Array.from(checked).map(function (cb) { return cb.dataset.fingerprint; });
}

async function batchAddScans() {
    var fps = getSelectedFingerprints();
    if (fps.length === 0) { alert('Select at least one device.'); return; }
    var count = prompt('How many scan credits to add to each selected device?', '2');
    if (!count || isNaN(count)) return;
    var csv = fps.map(function (fp) { return fp + ',' + count; }).join('\n');
    var result = await fetchJSON('/api/dashboard/bulk-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csv, count: parseInt(count) })
    });
    if (result) {
        alert('Added ' + count + ' scans to ' + result.success + ' devices.');
        loadDevices();
    }
}

async function batchExportCSV() {
    var fps = getSelectedFingerprints();
    if (fps.length === 0) { alert('Select at least one device.'); return; }
    var devData = await fetchJSON('/api/dashboard/devices');
    if (!devData) return;
    var devices = devData.devices.filter(function (d) { return fps.includes(d.fingerprint); });
    var csv = 'Hostname,Organization,Fingerprint,Scans Used,Scans Remaining,Last Seen\n';
    devices.forEach(function (d) {
        csv += [d.hostname, d.org_name, d.fingerprint, d.scans_used, d.scans_remaining, d.last_seen].join(',') + '\n';
    });
    var blob = new Blob([csv], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'selected_devices_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
}

function toggleSelectAll(masterCb) {
    document.querySelectorAll('.device-checkbox').forEach(function (cb) {
        cb.checked = masterCb.checked;
        toggleDeviceSelect(cb.dataset.fingerprint, cb);
    });
}
function updateBatchToolbar() {
    var count = document.querySelectorAll('.device-checkbox:checked').length;
    var btns = ['batch-scans-btn', 'batch-export-btn'];
    btns.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.style.display = count > 0 ? 'inline-flex' : 'none';
    });
}

// ══════════════════════════════════════════
// CREDITS & BILLING (₹25/scan)
// ══════════════════════════════════════════

async function loadCredits() {
    const auth = JSON.parse(sessionStorage.getItem('catalyst_auth') || '{}');
    const role = auth.role || '';
    const summary = document.getElementById('credit-summary');
    const addSection = document.getElementById('credit-add-section');
    const allocateSection = document.getElementById('credit-allocate-section');
    const orgBalances = document.getElementById('credit-org-balances');

    // Fetch balance data
    const data = await fetchJSON('/api/credits/balance');
    if (!data) { summary.innerHTML = '<p style="color:red">Failed to load credit data.</p>'; return; }

    if (role === 'super_admin') {
        // Show partner balances + add credits form
        addSection.style.display = '';
        allocateSection.style.display = 'none';
        orgBalances.style.display = 'none';

        const partners = data.partners || [];
        // Populate partner select
        const sel = document.getElementById('credit-partner-select');
        sel.innerHTML = '<option value="" disabled selected>Select Partner</option>' +
            partners.map(p => `<option value="${p.id}">${escapeHTML(p.name)} (Balance: ${p.credits?.partner_balance || 0})</option>`).join('');

        // Summary cards
        let totalCredits = 0, totalSpent = 0;
        partners.forEach(p => { totalCredits += (p.credits?.total_purchased || 0); totalSpent += (p.credits?.total_spent_inr || 0); });
        summary.innerHTML = `
            <div class="card" style="padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:800;color:#6366f1;">${partners.length}</div>
                <div style="font-size:12px;color:var(--text-muted)">Partners</div>
            </div>
            <div class="card" style="padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:800;color:#22c55e;">₹${data.cost_per_scan}</div>
                <div style="font-size:12px;color:var(--text-muted)">Per Scan</div>
            </div>
            <div class="card" style="padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:800;color:#3b82f6;">${totalCredits}</div>
                <div style="font-size:12px;color:var(--text-muted)">Total Scans Sold</div>
            </div>
            <div class="card" style="padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:800;color:#f59e0b;">₹${totalSpent.toLocaleString()}</div>
                <div style="font-size:12px;color:var(--text-muted)">Total Revenue</div>
            </div>`;

    } else if (role === 'partner') {
        // Show own balance + allocate form + org balances
        addSection.style.display = 'none';
        allocateSection.style.display = '';
        orgBalances.style.display = '';

        const bal = data.balance || {};
        const orgs = data.orgs || [];

        summary.innerHTML = `
            <div class="card" style="padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:800;color:#22c55e;">${bal.partner_balance || 0}</div>
                <div style="font-size:12px;color:var(--text-muted)">Available Scans</div>
            </div>
            <div class="card" style="padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:800;color:#3b82f6;">${bal.total_purchased || 0}</div>
                <div style="font-size:12px;color:var(--text-muted)">Total Purchased</div>
            </div>
            <div class="card" style="padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:800;color:#f59e0b;">${bal.allocated_to_orgs || 0}</div>
                <div style="font-size:12px;color:var(--text-muted)">Allocated to Customers</div>
            </div>
            <div class="card" style="padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:800;color:#06b6d4;">₹${(bal.total_spent_inr || 0).toLocaleString()}</div>
                <div style="font-size:12px;color:var(--text-muted)">Total Spent</div>
            </div>`;

        // Populate org select for allocation
        const sel = document.getElementById('allocate-org-select');
        sel.innerHTML = '<option value="" disabled selected>Select Organization</option>' +
            orgs.map(o => `<option value="${o.id}">${escapeHTML(o.name)} (${o.credits?.credit_balance || 0} scans)</option>`).join('');

        // Org balance table
        const body = document.getElementById('org-balances-body');
        if (orgs.length > 0) {
            body.innerHTML = `<table class="data-table"><thead><tr>
                <th>Organization</th><th>Credits</th><th>Used</th><th>Remaining</th>
            </tr></thead><tbody>` +
                orgs.map(o => {
                    const c = o.credits || {};
                    const used = (c.total_purchased || 0) - (c.credit_balance || 0);
                    return `<tr>
                    <td>${escapeHTML(o.name)}</td>
                    <td>${c.total_purchased || 0}</td>
                    <td>${used}</td>
                    <td class="${c.credit_balance <= 0 ? 'text-red' : 'text-green'}">${c.credit_balance || 0}</td>
                </tr>`;
                }).join('') + '</tbody></table>';
        } else {
            body.innerHTML = '<p style="color:var(--text-muted)">No organizations assigned.</p>';
        }

    } else if (role === 'end_customer') {
        // Read-only balance view
        addSection.style.display = 'none';
        allocateSection.style.display = 'none';
        orgBalances.style.display = 'none';

        const bal = data || {};
        const used = (bal.total_purchased || 0) - (bal.credit_balance || 0);
        summary.innerHTML = `
            <div class="card" style="padding:20px;text-align:center;">
                <div style="font-size:36px;font-weight:800;color:#22c55e;">${bal.credit_balance || 0}</div>
                <div style="font-size:14px;color:var(--text-muted)">Scans Remaining</div>
            </div>
            <div class="card" style="padding:20px;text-align:center;">
                <div style="font-size:36px;font-weight:800;color:#3b82f6;">${bal.total_purchased || 0}</div>
                <div style="font-size:14px;color:var(--text-muted)">Total Purchased</div>
            </div>
            <div class="card" style="padding:20px;text-align:center;">
                <div style="font-size:36px;font-weight:800;color:#f59e0b;">${used}</div>
                <div style="font-size:14px;color:var(--text-muted)">Scans Used</div>
            </div>
            <div class="card" style="padding:20px;text-align:center;">
                <div style="font-size:36px;font-weight:800;color:#06b6d4;">₹${bal.cost_per_scan || 199}</div>
                <div style="font-size:14px;color:var(--text-muted)">Cost Per Scan</div>
            </div>`;
    }

    // Load transaction ledger
    loadCreditLedger();
}

async function addCredits() {
    const partnerId = document.getElementById('credit-partner-select').value;
    const amount = parseFloat(document.getElementById('credit-amount-inr').value);
    if (!partnerId) return showToast('Select a partner first.', 'error');
    if (!amount || amount < 199) return showToast('Minimum amount is ₹199.', 'error');

    const scans = Math.floor(amount / 199);
    if (!confirm(`Add ₹${amount} (= ${scans} scans) to this partner?`)) return;

    const result = await postJSON('/api/admin/credits/add', { partner_id: parseInt(partnerId), amount_inr: amount });
    if (result && result.success) {
        showToast(`Added ${result.credits_added} scans (₹${result.amount_inr})`, 'success');
        document.getElementById('credit-amount-inr').value = '';
        loadCredits();
    } else {
        showToast(result?.error || 'Failed to add credits', 'error');
    }
}

async function allocateCredits() {
    const orgId = document.getElementById('allocate-org-select').value;
    const credits = parseInt(document.getElementById('allocate-credits').value);
    if (!orgId) return showToast('Select an organization first.', 'error');
    if (!credits || credits < 1) return showToast('Enter at least 1 scan.', 'error');

    if (!confirm(`Allocate ${credits} scans to this organization?`)) return;

    const result = await postJSON('/api/partner/credits/allocate', { org_id: orgId, credits: credits });
    if (result && result.success) {
        showToast(`Allocated ${result.credits_allocated} scans. Your balance: ${result.partner_balance}`, 'success');
        document.getElementById('allocate-credits').value = '';
        loadCredits();
    } else {
        showToast(result?.error || 'Failed to allocate credits', 'error');
    }
}

async function loadCreditLedger() {
    const data = await fetchJSON('/api/credits/ledger');
    const body = document.getElementById('credit-ledger-body');
    if (!data || !data.ledger || data.ledger.length === 0) {
        body.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">No transactions yet.</p>';
        return;
    }

    const typeColors = { purchase: '#22c55e', allocation: '#3b82f6', scan_debit: '#ef4444', refund: '#f59e0b', adjustment: '#8b5cf6' };
    const typeLabels = { purchase: '💰 Purchase', allocation: '📤 Allocation', scan_debit: '<iconify-icon icon="lucide:search"></iconify-icon> Scan', refund: '↩️ Refund', adjustment: '🔧 Adjustment' };

    body.innerHTML = `<table class="data-table"><thead><tr>
        <th>Date</th><th>Type</th><th>Credits</th><th>Amount</th><th>Balance</th><th>Description</th>
    </tr></thead><tbody>` +
        data.ledger.map(tx => `<tr>
        <td>${timeAgo(tx.created_at)}</td>
        <td><span style="color:${typeColors[tx.transaction_type] || '#64748b'}">${typeLabels[tx.transaction_type] || tx.transaction_type}</span></td>
        <td style="font-weight:700;color:${tx.credits > 0 ? '#22c55e' : '#ef4444'}">${tx.credits > 0 ? '+' : ''}${tx.credits}</td>
        <td>₹${Math.abs(tx.amount_inr || 0).toLocaleString()}</td>
        <td>${tx.balance_after}</td>
        <td style="font-size:12px;color:var(--text-muted)">${escapeHTML(tx.description || '-')}</td>
    </tr>`).join('') + '</tbody></table>';
}


// ══════════════════════════════════════════
// PHASE 3: AUDIT LOG VIEWER
// ══════════════════════════════════════════

var _auditPageSize = 50;

async function loadAuditLog(offset) {
    offset = offset || 0;
    var contentEl = document.getElementById('audit-log-content');
    var paginationEl = document.getElementById('audit-log-pagination');
    if (!contentEl) return;
    contentEl.textContent = '';
    var loadingP = document.createElement('p');
    loadingP.className = 'loading';
    loadingP.textContent = 'Loading audit log...';
    contentEl.appendChild(loadingP);

    var params = new URLSearchParams();
    params.set('limit', _auditPageSize);
    params.set('offset', offset);
    var userFilter = document.getElementById('audit-filter-user');
    var actionFilter = document.getElementById('audit-filter-action');
    var fromFilter = document.getElementById('audit-filter-from');
    var toFilter = document.getElementById('audit-filter-to');
    if (userFilter && userFilter.value) params.set('username', userFilter.value);
    if (actionFilter && actionFilter.value) params.set('action', actionFilter.value);
    if (fromFilter && fromFilter.value) params.set('date_from', fromFilter.value + 'T00:00:00Z');
    if (toFilter && toFilter.value) params.set('date_to', toFilter.value + 'T23:59:59Z');

    var data = await fetchJSON('/api/admin/audit-log?' + params.toString());
    if (!data || !data.logs || data.logs.length === 0) {
        contentEl.textContent = '';
        var emptyP = document.createElement('p');
        emptyP.style.cssText = 'color:var(--text-muted);text-align:center;padding:20px;';
        emptyP.textContent = 'No audit log entries found.';
        contentEl.appendChild(emptyP);
        if (paginationEl) paginationEl.textContent = '';
        return;
    }

    var container = document.createElement('div');
    container.className = 'table-container';
    var table = document.createElement('table');
    table.className = 'data-table';
    table.style.fontSize = '12px';
    var thead = document.createElement('thead');
    var headerRow = document.createElement('tr');
    ['Timestamp', 'User', 'Action', 'Target', 'Details'].forEach(function (h) {
        var th = document.createElement('th');
        th.textContent = h;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    data.logs.forEach(function (l) {
        var tr = document.createElement('tr');
        var tdTime = document.createElement('td');
        tdTime.textContent = l.timestamp || '-';
        var tdUser = document.createElement('td');
        tdUser.textContent = l.username || '-';
        var tdAction = document.createElement('td');
        var code = document.createElement('code');
        code.textContent = l.action || '';
        tdAction.appendChild(code);
        var tdTarget = document.createElement('td');
        tdTarget.textContent = (l.target_type || '') + ' ' + (l.target_id || '');
        var tdDetails = document.createElement('td');
        tdDetails.textContent = l.details || '-';
        tdDetails.style.maxWidth = '300px';
        tdDetails.style.overflow = 'hidden';
        tdDetails.style.textOverflow = 'ellipsis';
        tr.appendChild(tdTime);
        tr.appendChild(tdUser);
        tr.appendChild(tdAction);
        tr.appendChild(tdTarget);
        tr.appendChild(tdDetails);
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
    contentEl.textContent = '';
    contentEl.appendChild(container);

    // Pagination
    if (paginationEl) {
        paginationEl.textContent = '';
        var total = data.total || 0;
        var infoSpan = document.createElement('span');
        infoSpan.style.cssText = 'font-size:13px;color:var(--text-muted);';
        infoSpan.textContent = 'Showing ' + (offset + 1) + '-' + Math.min(offset + _auditPageSize, total) + ' of ' + total;
        paginationEl.appendChild(infoSpan);

        var btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display:flex;gap:8px;';
        if (offset > 0) {
            var prevBtn = document.createElement('button');
            prevBtn.className = 'btn btn-sm btn-ghost';
            prevBtn.textContent = '<iconify-icon icon="lucide:arrow-left"></iconify-icon> Previous';
            prevBtn.onclick = function () { loadAuditLog(Math.max(0, offset - _auditPageSize)); };
            btnGroup.appendChild(prevBtn);
        }
        if (offset + _auditPageSize < total) {
            var nextBtn = document.createElement('button');
            nextBtn.className = 'btn btn-sm btn-ghost';
            nextBtn.textContent = 'Next →';
            nextBtn.onclick = function () { loadAuditLog(offset + _auditPageSize); };
            btnGroup.appendChild(nextBtn);
        }
        paginationEl.appendChild(btnGroup);
    }
}

function clearAuditFilters() {
    var fields = ['audit-filter-user', 'audit-filter-action', 'audit-filter-from', 'audit-filter-to'];
    fields.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    loadAuditLog(0);
}


// ══════════════════════════════════════════
// PHASE 3: CSV EXPORT
// ══════════════════════════════════════════

function exportDevicesCSV() {
    var scope = getOrgScope();
    var url = '/api/dashboard/export/devices/csv';
    if (scope) url += '?org_id=' + encodeURIComponent(scope);
    window.open(url, '_blank');
}

function exportFleetHealthCSV() {
    var scope = getOrgScope();
    var url = '/api/dashboard/export/fleet-health/csv';
    if (scope) url += '?org_id=' + encodeURIComponent(scope);
    window.open(url, '_blank');
}

function exportScanResultsCSV(fingerprint) {
    var url = '/api/dashboard/export/scan-results/csv?fingerprint=' + encodeURIComponent(fingerprint);
    window.open(url, '_blank');
}


// ══════════════════════════════════════════
// PHASE 3: MULTI-SCAN COMPARISON
// ══════════════════════════════════════════

async function compareScanResults(fingerprint, scan1Id, scan2Id) {
    var data = await fetchJSON('/api/dashboard/device/' + encodeURIComponent(fingerprint) + '/compare?scan1=' + scan1Id + '&scan2=' + scan2Id);
    if (!data) { showToast('Failed to load comparison data', 'error'); return; }

    var modal = document.getElementById('device-modal');
    var body = document.getElementById('modal-body');
    var title = document.getElementById('modal-title');
    if (title) title.textContent = 'Scan Comparison: ' + fingerprint.substring(0, 8) + '...';

    // Build comparison view using DOM API
    body.textContent = '';

    // Summary row
    var summaryGrid = document.createElement('div');
    summaryGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;';

    function makeScanCard(scan, label) {
        var card = document.createElement('div');
        card.style.cssText = 'background:var(--bg-primary);padding:16px;border-radius:8px;border:1px solid var(--border);';
        var h4 = document.createElement('h4');
        h4.style.cssText = 'font-size:13px;color:var(--text-muted);margin-bottom:8px;';
        h4.textContent = label;
        card.appendChild(h4);
        var gradeSpan = document.createElement('span');
        gradeSpan.className = 'grade-badge grade-' + (scan.overall_grade || '?').toLowerCase();
        gradeSpan.style.cssText = 'font-size:24px;padding:8px 16px;';
        gradeSpan.textContent = scan.overall_grade || '?';
        card.appendChild(gradeSpan);
        var scoreP = document.createElement('p');
        scoreP.style.cssText = 'font-size:14px;margin-top:8px;color:var(--text-secondary);';
        scoreP.textContent = 'Score: ' + (scan.overall_score || 0) + '/100';
        card.appendChild(scoreP);
        var timeP = document.createElement('p');
        timeP.style.cssText = 'font-size:11px;color:var(--text-muted);margin-top:4px;';
        timeP.textContent = scan.timestamp || '';
        card.appendChild(timeP);
        return card;
    }

    summaryGrid.appendChild(makeScanCard(data.scan1, 'Scan #' + data.scan1.id + ' (Older)'));
    summaryGrid.appendChild(makeScanCard(data.scan2, 'Scan #' + data.scan2.id + ' (Newer)'));
    body.appendChild(summaryGrid);

    // Delta indicator
    var deltaDiv = document.createElement('div');
    deltaDiv.style.cssText = 'text-align:center;padding:12px;margin-bottom:16px;border-radius:8px;background:' + (data.score_delta >= 0 ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)') + ';';
    var deltaSpan = document.createElement('span');
    deltaSpan.style.cssText = 'font-size:18px;font-weight:700;color:' + (data.score_delta >= 0 ? 'var(--accent-green)' : 'var(--accent-red)') + ';';
    deltaSpan.textContent = (data.score_delta >= 0 ? '▲ +' : '▼ ') + data.score_delta + ' points';
    deltaDiv.appendChild(deltaSpan);
    body.appendChild(deltaDiv);

    // Component diff table
    if (data.component_diffs && data.component_diffs.length > 0) {
        var tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';
        var table = document.createElement('table');
        table.className = 'data-table';
        table.style.fontSize = '13px';
        var thead = document.createElement('thead');
        var headerRow = document.createElement('tr');
        ['Component', 'Scan #' + data.scan1.id, 'Scan #' + data.scan2.id, 'Change'].forEach(function (h) {
            var th = document.createElement('th');
            th.textContent = h;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        var tbody = document.createElement('tbody');
        data.component_diffs.forEach(function (d) {
            var tr = document.createElement('tr');
            var tdComp = document.createElement('td');
            tdComp.style.fontWeight = '600';
            tdComp.textContent = d.component;
            var tdS1 = document.createElement('td');
            tdS1.textContent = d.scan1_score;
            var tdS2 = document.createElement('td');
            tdS2.textContent = d.scan2_score;
            var tdDelta = document.createElement('td');
            tdDelta.style.fontWeight = '700';
            tdDelta.style.color = d.delta > 0 ? 'var(--accent-green)' : d.delta < 0 ? 'var(--accent-red)' : 'var(--text-muted)';
            tdDelta.textContent = (d.delta > 0 ? '+' : '') + d.delta;
            tr.appendChild(tdComp);
            tr.appendChild(tdS1);
            tr.appendChild(tdS2);
            tr.appendChild(tdDelta);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        body.appendChild(tableContainer);
    }

    if (modal) modal.style.display = 'flex';
}
