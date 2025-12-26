import re

# Read the unified CSS file
with open(r'c:\Users\Shakir\.gemini\antigravity\scratch\karam-platform\styles\unified-dashboards.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Split into sections based on the markers found
family_section = content[0:16358]  
operator_section = content[16358:26446]
visitor_section = content[26446:33312]
dashboard_section = content[33312:]

# Function to add namespace prefix
def add_namespace(css_text, namespace):
    lines = css_text.split('\n')
    result = []
    
    for line in lines:
        # Skip empty lines, comments, @rules, :root, body, *, @media, and @keyframes
        if (not line.strip() or 
            line.strip().startswith('/*') or 
            line.strip().startswith('*') and '{' in line or
            line.strip().startswith('@') or 
            line.strip().startswith(':root') or
            line.strip() == 'body {' or
            line.strip().startswith('body.rtl') or
            line.strip().startswith('body {')):
            result.append(line)
        # If it's a CSS selector line (ends with { or has comma)
        elif '{' in line and not line.strip().startswith('}'):
            # Split by comma for multiple selectors
            selectors = line.split('{')[0].split(',')
            new_selectors = []
            
            for selector in selectors:
                selector = selector.strip()
                if selector:
                    # Add namespace prefix
                    new_selectors.append(f'{namespace} {selector}')
            
            if new_selectors:
                rest_of_line = '{' + line.split('{', 1)[1] if '{' in line else ''
                result.append(', '.join(new_selectors) + rest_of_line)
            else:
                result.append(line)
        else:
            result.append(line)
    
    return '\n'.join(result)

# Apply namespaces
family_css = add_namespace(family_section, '.family-dash')
operator_css = add_namespace(operator_section, '.operator-dash')
visitor_css = add_namespace(visitor_section, '.visitor-dash')  
dashboard_css = add_namespace(dashboard_section, '.company-dash')

# Combine all sections
final_css = family_css + operator_css + visitor_css + dashboard_css

# Write the result
with open(r'c:\Users\Shakir\.gemini\antigravity\scratch\karam-platform\styles\unified-dashboards.css', 'w', encoding='utf-8') as f:
    f.write(final_css)

print("CSS namespacing completed!")
print(f"Total lines processed: {len(final_css.split(chr(10)))}")
