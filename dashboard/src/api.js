import { getDummyData } from './dummyData';

export const API = 'https://catalystscan.bostontechindia.in';

export function getAuthToken() {
    const auth = sessionStorage.getItem('catalyst_auth');
    if (auth) {
        try {
            return JSON.parse(auth).token;
        } catch (e) {
            return null;
        }
    }
    return null;
}

export function getOrgScope() {
    try {
        const auth = JSON.parse(sessionStorage.getItem('catalyst_auth') || '{}');
        if (auth.role === 'org_user' && auth.org_id) return auth.org_id;
    } catch (e) {
        // ignore
    }
    return null;
}

export async function fetchJSON(url) {
    const token = getAuthToken();
    if (!token) {
        console.warn('fetchJSON: No session token, skipping', url);
        return null;
    }

    const headers = { 'Authorization': `Bearer ${token}` };

    let scopedUrl = url;
    const orgScope = getOrgScope();
    if (orgScope && url.startsWith('/api/dashboard/')) {
        const sep = url.includes('?') ? '&' : '?';
        scopedUrl = url + sep + 'org_id=' + encodeURIComponent(orgScope);
    }

    try {
        const res = await fetch(API + scopedUrl, { headers });
        if (res.status === 401) {
            console.warn('fetchJSON: 401 received');
            return { error: 401 };
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        
        // Use dummy data if the response object/array is empty
        if (!data || (Array.isArray(data) && data.length === 0) || (Object.keys(data).length === 0)) {
            console.warn('fetchJSON: Empty data returned from backend, providing dummy fallback for', url);
            return getDummyData(url);
        }
        return data;
    } catch (e) {
        console.error('API Error:', url, e);
        console.warn('fetchJSON: Providing dummy fallback for', url);
        return getDummyData(url);
    }
}

export async function postJSON(url, data, method = 'POST') {
    const token = getAuthToken();
    if (!token && url !== '/api/auth/login') {
        console.warn('postJSON: No session token, skipping', url);
        return null;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const res = await fetch(API + url, {
            method: method,
            headers: headers,
            body: JSON.stringify(data),
        });

        if (res.status === 401 && url !== '/api/auth/login') {
            return { error: 401 };
        }

        const json = await res.json().catch(() => null);
        if (!res.ok) {
            return { error: res.status, data: json };
        }
        return json;
    } catch (e) {
        console.error('API Error:', url, e);
        return null;
    }
}
