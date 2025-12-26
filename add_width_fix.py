import re

# Read the CSS file
with open(r'c:\Users\Shakir\.gemini\antigravity\scratch\karam-platform\styles\unified-dashboards.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and fix operator-dash .main-content (add width if missing)
# Find the section
operator_main_pattern = r'(\.operator-dash\s+\.main-content\s*\{\s*[^}]*?)(}\s)'
visitor_main_pattern = r'(\.visitor-dash\s+\.main-content\s*\{\s*[^}]*?)(}\s)'

# Check if width is already there, if not add it
def add_width_if_missing(match):
    rules = match.group(1)
    closing = match.group(2)
    
    if 'width:' not in rules and 'width :' not in rules:
        # Add width before closing brace
        # Remove trailing whitespace and add width
        rules = rules.rstrip()
        if not rules.endswith(';'):
            rules += ';'
        rules += '\n    width: calc(100% - var(--sidebar-width));'
    
    return rules + '\n' + closing

content = re.sub(operator_main_pattern, add_width_if_missing, content, flags=re.DOTALL)
content = re.sub(visitor_main_pattern, add_width_if_missing, content, flags=re.DOTALL)

# Write back
with open(r'c:\Users\Shakir\.gemini\antigravity\scratch\karam-platform\styles\unified-dashboards.css', 'w', encoding='utf-8') as f:
    f.write(content)

print("Width fix applied to operator-dash and visitor-dash!")
