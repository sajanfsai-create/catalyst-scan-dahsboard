import os

def replace_emojis_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    for old, new in replacements.items():
        content = content.replace(old, new)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# Iconify script to add to head
ICONIFY_SCRIPT = '<script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>'

replacements_html = {
    '</head>': f'    {ICONIFY_SCRIPT}\n</head>',
    '📊': '<iconify-icon icon="lucide:layout-dashboard"></iconify-icon>',
    '💻': '<iconify-icon icon="lucide:laptop"></iconify-icon>',
    '🗄️': '<iconify-icon icon="lucide:database"></iconify-icon>',
    '♻️': '<iconify-icon icon="lucide:recycle"></iconify-icon>',
    '📅': '<iconify-icon icon="lucide:calendar"></iconify-icon>',
    '📄': '<iconify-icon icon="lucide:file-text"></iconify-icon>',
    '🖥️': '<iconify-icon icon="lucide:monitor"></iconify-icon>',
    '🤝': '<iconify-icon icon="lucide:users"></iconify-icon>',
    '👤': '<iconify-icon icon="lucide:user"></iconify-icon>',
    '🏢': '<iconify-icon icon="lucide:building"></iconify-icon>',
    '🔔': '<iconify-icon icon="lucide:bell"></iconify-icon>',
    '⚙️': '<iconify-icon icon="lucide:settings"></iconify-icon>',
    '🔑': '<iconify-icon icon="lucide:key"></iconify-icon>',
    '🏛️': '<iconify-icon icon="lucide:landmark"></iconify-icon>',
    '🔧': '<iconify-icon icon="lucide:wrench"></iconify-icon>',
    '💰': '<iconify-icon icon="lucide:dollar-sign"></iconify-icon>',
    '📋': '<iconify-icon icon="lucide:clipboard-list"></iconify-icon>',
    '↪': '<iconify-icon icon="lucide:log-out"></iconify-icon>',
    '🌙': '<iconify-icon icon="lucide:moon" id="theme-icon"></iconify-icon>',
    '🔄': '<iconify-icon icon="lucide:refresh-cw"></iconify-icon>',
    '☰': '<iconify-icon icon="lucide:menu"></iconify-icon>',
    '🔐': '<iconify-icon icon="lucide:lock"></iconify-icon>',
    '🖥': '<iconify-icon icon="lucide:monitor"></iconify-icon>',
    '📶': '<iconify-icon icon="lucide:wifi"></iconify-icon>',
    '📵': '<iconify-icon icon="lucide:wifi-off"></iconify-icon>',
    '⚠': '<iconify-icon icon="lucide:alert-triangle"></iconify-icon>',
    '📥': '<iconify-icon icon="lucide:download"></iconify-icon>',
    '➕': '<iconify-icon icon="lucide:plus"></iconify-icon>',
    '📤': '<iconify-icon icon="lucide:upload"></iconify-icon>',
    '🔍': '<iconify-icon icon="lucide:search"></iconify-icon>',
    '⬇️': '<iconify-icon icon="lucide:download"></iconify-icon>',
    '🎓': '<iconify-icon icon="lucide:graduation-cap"></iconify-icon>',
    '📈': '<iconify-icon icon="lucide:trending-up"></iconify-icon>',
    '📝': '<iconify-icon icon="lucide:edit"></iconify-icon>',
    '❌': '<iconify-icon icon="lucide:x-circle"></iconify-icon>',
    '✅': '<iconify-icon icon="lucide:check-circle"></iconify-icon>',
    'ℹ️': '<iconify-icon icon="lucide:info"></iconify-icon>',
    '🚧': '<iconify-icon icon="lucide:construction"></iconify-icon>',
    '📧': '<iconify-icon icon="lucide:mail"></iconify-icon>',
    '📞': '<iconify-icon icon="lucide:phone"></iconify-icon>',
    '←': '<iconify-icon icon="lucide:arrow-left"></iconify-icon>',
    '🛡️': '<iconify-icon icon="lucide:shield"></iconify-icon>',
    '💾': '<iconify-icon icon="lucide:save"></iconify-icon>',
    '📒': '<iconify-icon icon="lucide:book"></iconify-icon>',
    '📦': '<iconify-icon icon="lucide:package"></iconify-icon>',
    '<span class="nav-icon"><iconify-icon': '<span class="nav-icon" style="display:flex;align-items:center;"><iconify-icon',
}

replacements_js = {
    '✅': '<iconify-icon icon="lucide:check-circle"></iconify-icon>',
    '❌': '<iconify-icon icon="lucide:x-circle"></iconify-icon>',
    'ℹ️': '<iconify-icon icon="lucide:info"></iconify-icon>',
    '🌙': '<iconify-icon icon="lucide:moon"></iconify-icon>',
    '☀️': '<iconify-icon icon="lucide:sun"></iconify-icon>',
    '🔑': '<iconify-icon icon="lucide:key"></iconify-icon>',
    '📧': '<iconify-icon icon="lucide:mail"></iconify-icon>',
    '📞': '<iconify-icon icon="lucide:phone"></iconify-icon>',
    '🚧': '<iconify-icon icon="lucide:construction"></iconify-icon>',
    '←': '<iconify-icon icon="lucide:arrow-left"></iconify-icon>',
    '💻': '<iconify-icon icon="lucide:laptop"></iconify-icon>',
    '🛡️': '<iconify-icon icon="lucide:shield"></iconify-icon>',
    '⚠️': '<iconify-icon icon="lucide:alert-triangle"></iconify-icon>',
    '📄': '<iconify-icon icon="lucide:file-text"></iconify-icon>',
    '🔍': '<iconify-icon icon="lucide:search"></iconify-icon>',
    '➕': '<iconify-icon icon="lucide:plus"></iconify-icon>',
    '✅ Resolve': '<iconify-icon icon="lucide:check-circle"></iconify-icon> Resolve',
    '✅ Resolved': '<iconify-icon icon="lucide:check-circle"></iconify-icon> Resolved',
    '⚠': '<iconify-icon icon="lucide:alert-triangle"></iconify-icon>',
    '🗄️': '<iconify-icon icon="lucide:database"></iconify-icon>'
}

replace_emojis_in_file(r'c:\Users\venga\Desktop\universe\catalyst-scan-dahsboard\dashboard\index.html', replacements_html)
replace_emojis_in_file(r'c:\Users\venga\Desktop\universe\catalyst-scan-dahsboard\dashboard\app.js', replacements_js)

print("Replacement complete.")
