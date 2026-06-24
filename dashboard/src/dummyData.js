export const getDummyData = (url) => {
    // Determine which dummy data to return based on the endpoint path
    const path = url.split('?')[0];

    switch (path) {
        case '/api/dashboard/stats':
            return {
                total_devices: 142,
                online: 118,
                offline: 24,
                active_alerts: 5
            };

        case '/api/dashboard/devices':
            return {
                devices: [
                    { hostname: 'LAB1-PC01', org_name: 'Engineering', online: true, last_seen: new Date().toISOString(), fingerprint: 'a1b2c3d4e5f6g7h8', scans_used: 12, total_scans: 50, scans_remaining: 38 },
                    { hostname: 'LAB1-PC02', org_name: 'Engineering', online: true, last_seen: new Date().toISOString(), fingerprint: 'h8g7f6e5d4c3b2a1', scans_used: 5, total_scans: 50, scans_remaining: 45 },
                    { hostname: 'LIB-KIOSK1', org_name: 'Library', online: false, last_seen: new Date(Date.now() - 86400000).toISOString(), fingerprint: '1122334455667788', scans_used: 48, total_scans: 50, scans_remaining: 2 },
                    { hostname: 'ADMIN-LAPTOP', org_name: 'Administration', online: true, last_seen: new Date().toISOString(), fingerprint: 'aabbccddeeff1122', scans_used: 2, total_scans: 10, scans_remaining: 8 }
                ]
            };

        case '/api/dashboard/alerts':
            return {
                total: 3,
                alerts: [
                    { org_name: 'Engineering', timestamp: new Date().toISOString(), fingerprint: 'a1b2c3d4e5f6g7h8', tamper_data: { changes: [{ component: 'RAM', type: 'Removed', baseline: '16GB', current: '8GB', severity: 'High' }] } },
                    { org_name: 'Library', timestamp: new Date(Date.now() - 3600000).toISOString(), fingerprint: '1122334455667788', tamper_data: { changes: [{ component: 'Disk', type: 'Replaced', severity: 'Medium' }] } },
                    { org_name: 'Engineering', timestamp: new Date(Date.now() - 7200000).toISOString(), fingerprint: 'h8g7f6e5d4c3b2a1', tamper_data: { changes: [{ component: 'CPU', type: 'Mismatch', severity: 'Critical' }] } }
                ]
            };

        case '/api/dashboard/ewaste-report':
            return {
                keep: 85,
                review: 20,
                e_waste: 15,
                compliance_note: 'Based on 5+ years of age and critical health grades.',
                items: [
                    { disposal_flag: 'dispose', hostname: 'OLD-DELL-01', org_name: 'Administration', bios_age_years: 7, overall_grade: 'F', cpu: 'Intel Core i3 4th Gen', ram_gb: 4, reason: 'Age > 5yrs, Health F' },
                    { disposal_flag: 'review', hostname: 'LAB2-PC05', org_name: 'Engineering', bios_age_years: 4, overall_grade: 'C', cpu: 'Intel Core i5 8th Gen', ram_gb: 8, reason: 'Health C' },
                    { disposal_flag: 'keep', hostname: 'LAB1-PC01', org_name: 'Engineering', bios_age_years: 1, overall_grade: 'A', cpu: 'Intel Core i7 12th Gen', ram_gb: 16, reason: 'Good condition' }
                ]
            };

        case '/api/dashboard/amc':
            return {
                active: 100,
                expiring_soon: 12,
                expired: 5,
                records: [
                    { status: 'expired', hostname: 'OLD-DELL-01', vendor_name: 'Dell', contract_type: 'warranty', end_date: '2023-12-01', days_remaining: -140, cost_inr: 0 },
                    { status: 'expiring_soon', hostname: 'LAB2-PC05', vendor_name: 'HP', contract_type: 'amc', end_date: '2024-05-20', days_remaining: 30, cost_inr: 4500 },
                    { status: 'active', hostname: 'LAB1-PC01', vendor_name: 'Lenovo', contract_type: 'warranty', end_date: '2026-08-15', days_remaining: 800, cost_inr: 0 }
                ]
            };

        case '/api/dashboard/lab-utilization':
            return {
                avg_utilization_pct: 45,
                period_days: 30,
                total_devices: 142,
                recommendation: 'Consider consolidating devices in Library as utilization is below 20%.',
                categories: { high: 40, medium: 60, low: 30, idle: 12 },
                devices: [
                    { hostname: 'LAB1-PC01', org_name: 'Engineering', utilization_pct: 85, category: 'high', heartbeat_count: 5200, last_seen: new Date().toISOString() },
                    { hostname: 'LAB1-PC02', org_name: 'Engineering', utilization_pct: 45, category: 'medium', heartbeat_count: 2400, last_seen: new Date().toISOString() },
                    { hostname: 'LIB-KIOSK1', org_name: 'Library', utilization_pct: 12, category: 'low', heartbeat_count: 450, last_seen: new Date(Date.now() - 86400000).toISOString() },
                    { hostname: 'ADMIN-LAPTOP', org_name: 'Administration', utilization_pct: 2, category: 'idle', heartbeat_count: 12, last_seen: new Date(Date.now() - 172800000).toISOString() }
                ],
                organizations: [
                    { org_name: 'Engineering', device_count: 80, active_count: 75, avg_score: 82, grades: { A: 40, B: 25, C: 10, D: 4, F: 1 } },
                    { org_name: 'Library', device_count: 40, active_count: 38, avg_score: 65, grades: { A: 10, B: 10, C: 15, D: 3, F: 2 } },
                    { org_name: 'Administration', device_count: 22, active_count: 20, avg_score: 91, grades: { A: 15, B: 7, C: 0, D: 0, F: 0 } }
                ]
            };

        case '/api/dashboard/orgs':
            return {
                organizations: [
                    { id: 'ORG-001', name: 'Engineering Dept', contact_email: 'eng@example.com', contact_phone: '+1234567890' },
                    { id: 'ORG-002', name: 'Library Services', contact_email: 'lib@example.com', contact_phone: '+1987654321' },
                    { id: 'ORG-003', name: 'Central Administration', contact_email: 'admin@example.com', contact_phone: '+1122334455' }
                ]
            };
            
        case '/api/admin/users':
            return {
                users: [
                    { username: 'admin', role: 'super_admin', email: 'admin@catalyst.com', last_login: new Date().toISOString() },
                    { username: 'eng_lead', role: 'org_user', email: 'lead@eng.com', last_login: new Date(Date.now() - 86400000).toISOString() },
                    { username: 'partner_sys', role: 'partner', email: 'sys@partner.com', last_login: new Date(Date.now() - 3600000).toISOString() }
                ]
            };
            
        case '/api/dashboard/multi-org/summary':
            return {
                total_organizations: 3,
                total_devices: 142,
                total_online: 118,
                organizations: [
                    { org_id: 'ORG-001', org_name: 'Engineering Dept', health_score: 82, device_count: 80, online_count: 75, offline_count: 5, scans_used: 120, total_scans: 500, scans_remaining: 380, grade_distribution: { A: 40, B: 25, C: 10, D: 4, F: 1 } },
                    { org_id: 'ORG-002', org_name: 'Library Services', health_score: 65, device_count: 40, online_count: 38, offline_count: 2, scans_used: 150, total_scans: 200, scans_remaining: 50, grade_distribution: { A: 10, B: 10, C: 15, D: 3, F: 2 } },
                    { org_id: 'ORG-003', org_name: 'Central Admin', health_score: 91, device_count: 22, online_count: 20, offline_count: 2, scans_used: 15, total_scans: 100, scans_remaining: 85, grade_distribution: { A: 15, B: 7, C: 0, D: 0, F: 0 } }
                ]
            };
            
        case '/api/build-exe/list':
            return {
                builds: [
                    { filename: 'CatalystScan_Engineering_v2.exe', size_mb: 15.4, created: new Date().toISOString() },
                    { filename: 'CatalystScan_Library_v2.exe', size_mb: 15.4, created: new Date(Date.now() - 86400000).toISOString() }
                ]
            };
            
        case '/api/build-exe/status':
            return { exists: true, size_mb: 15.2 };

        case '/api/dashboard/fleet-health':
            return {
                healthy_count: 97,
                warning_count: 25,
                critical_count: 10,
                total_devices: 132,
                grade_distribution: { A: 65, B: 32, C: 25, D: 7, F: 3 },
                replacement_needed: [
                    { hostname: 'OLD-DELL-01', org_name: 'Administration', overall_grade: 'F', components: [{ component: 'Disk', grade: 'F' }] },
                    { hostname: 'LIB-KIOSK-12', org_name: 'Library', overall_grade: 'D', components: [{ component: 'RAM', grade: 'D' }, { component: 'CPU', grade: 'C' }] }
                ]
            };

        // If the path includes specific device details
        default:
            if (path.match(/\/api\/dashboard\/device\/.*\/health/)) {
                return { overall_grade: 'A', overall_score: 92, components: [{ component: 'CPU', grade: 'A', score: 95 }, { component: 'RAM', grade: 'A', score: 90 }, { component: 'Disk', grade: 'B', score: 85 }] };
            }
            if (path.match(/\/api\/dashboard\/device\/.*/)) {
                return { device: { hostname: 'DUMMY-PC', org_name: 'Dummy Org', online: true, last_seen: new Date().toISOString(), fingerprint: 'dummy_fp', total_scans: 50, scans_used: 5 }, latest_scan: { scan_data: { os: { name: 'Windows 11' }, cpu: { brand: 'Intel Core i7' }, ram: { total_gb: 16 }, storage: { drives: [{ capacity_gb: 512 }] } } } };
            }
            
            // Generic fallback for any other unmapped endpoint
            return { data: [], success: true, message: 'Dummy data generated.' };
    }
};
