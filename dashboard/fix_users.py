#!/usr/bin/env python3
"""Patch app.js: Add password column + reset password to Users table."""
import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Password header between Display Name and Role
old_h = '<th>Display Name</th>\n                    <th>Role</th>'
new_h = '<th>Display Name</th>\n                    <th>Password</th>\n                    <th>Role</th>'
# Only replace in the Users section (after PHASE 9 comment)
phase9_idx = content.find('PHASE 9')
if phase9_idx > 0:
    before = content[:phase9_idx]
    after = content[phase9_idx:]
    after = after.replace(old_h, new_h, 1)
    content = before + after
    print('✅ Added Password header')
else:
    print('❌ PHASE 9 marker not found')

# 2. Add password masked cell after display_name cell
old_td = '${escapeHTML(u.display_name)}</td>\n                        <td><span class="badge"'
new_td = '${escapeHTML(u.display_name)}</td>\n                        <td><span style="letter-spacing:2px;color:var(--text-muted);font-size:16px;">\u2022\u2022\u2022\u2022\u2022\u2022</span></td>\n                        <td><span class="badge"'
if phase9_idx > 0:
    before = content[:phase9_idx]
    after = content[phase9_idx:]
    after = after.replace(old_td, new_td, 1)
    content = before + after
    print('✅ Added password masked cell')

# 3. Replace the Actions td to add reset password button
# Find the delete button in the Users section
old_action_start = content.find("deleteUserAction(${u.id}", phase9_idx)
if old_action_start > 0:
    # Find the <td> containing this button
    td_start = content.rfind('<td>', old_action_start - 200, old_action_start)
    td_end = content.find('</td>', old_action_start) + 5
    if td_start > 0 and td_end > 0:
        old_td_block = content[td_start:td_end]
        new_td_block = '''<td style="white-space:nowrap;">
                            <button class="btn btn-sm btn-ghost" onclick="showResetPasswordModal(${u.id}, '${escapeHTML(u.username)}')" title="Reset Password">\U0001f511</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteUserAction(${u.id}, '${escapeHTML(u.username)}')" title="Deactivate">\U0001f5d1</button>
                        </td>'''
        content = content[:td_start] + new_td_block + content[td_end:]
        print('✅ Replaced actions column')
    else:
        print(f'❌ td bounds not found: td_start={td_start}, td_end={td_end}')
else:
    print('❌ deleteUserAction not found in Users section')

# 4. Add showResetPasswordModal and resetUserPassword functions after deleteUserAction
insert_marker = "async function deleteUserAction(userId, username) {"
insert_idx = content.find(insert_marker, phase9_idx)
if insert_idx > 0:
    # Find the end of deleteUserAction function
    func_end = content.find('\n}\n', insert_idx) + 3
    if func_end > 3:
        new_funcs = '''
function showResetPasswordModal(userId, username) {
    const newPass = prompt('Set new password for "' + username + '":\\n(Minimum 6 characters)');
    if (!newPass) return;
    if (newPass.length < 6) { alert('Password must be at least 6 characters.'); return; }
    resetUserPassword(userId, username, newPass);
}

async function resetUserPassword(userId, username, newPassword) {
    const result = await postJSON('/api/admin/users/' + userId + '/reset-password', { new_password: newPassword });
    if (result && result.success) {
        alert('\u2705 Password for "' + username + '" has been reset successfully.');
    } else {
        alert('\u274c Failed to reset password for "' + username + '".');
    }
}
'''
        content = content[:func_end] + new_funcs + content[func_end:]
        print('✅ Added reset password functions')
    else:
        print('❌ End of deleteUserAction not found')
else:
    print('❌ deleteUserAction function not found')

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('\nDone! All patches applied.')
