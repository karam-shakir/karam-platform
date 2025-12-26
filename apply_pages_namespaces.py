import re

# Read the merged CSS file
with open(r'c:\Users\Shakir\.gemini\antigravity\scratch\karam-platform\styles\pages-core.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Split into sections based on markers
auth_end = content.find('/* ============================================\n   BROWSE PAGE STYLES')
browse_end = content.find('/* ============================================\n   CART PAGE STYLES')
cart_end = content.find('/* ============================================\n   FAMILY DETAILS PAGE STYLES')

auth_section = content[0:auth_end] if auth_end > 0 else content
browse_section = content[auth_end:browse_end] if browse_end > 0 else ""
cart_section = content[browse_end:cart_end] if cart_end > 0 else ""
family_details_section = content[cart_end:] if cart_end > 0 else ""

# Function to add namespace - improved version
def add_namespace_smart(css_text, namespace):
    lines = css_text.split('\n')
    result = []
    in_media_query = False
    in_keyframes = False
    
    for line in lines:
        stripped = line.strip()
        
        # Track @media and @keyframes
        if stripped.startswith('@media'):
            in_media_query = True
            result.append(line)
            continue
        elif stripped.startswith('@keyframes'):
            in_keyframes = True
            result.append(line)
            continue
        
        # Check for closing braces
        if stripped == '}' and in_keyframes:
            in_keyframes = False
            result.append(line)
            continue
            
        # Skip certain lines
        if (not stripped or 
            stripped.startswith('/*') or 
            stripped.startswith('*/') or
            stripped.startswith('*') and '{' in stripped or
            stripped.startswith('@') or 
            stripped.startswith(':root') or
            stripped == 'body {' or
            stripped.startswith('body.rtl') or
            stripped.startswith('body {')):
            result.append(line)
            continue
        
        # Don't namespace inside @keyframes
        if in_keyframes:
            result.append(line)
            continue
            
        # If it's a selector line (contains {)
        if '{' in line and not stripped.startswith('}'):
            # Split by comma for multiple selectors
            parts = line.split('{')
            selectors = parts[0].split(',')
            new_selectors = []
            
            for selector in selectors:
                selector = selector.strip()
                if selector:
                    # Only add namespace if not already there
                    if not selector.startswith(namespace):
                        new_selectors.append(f'{namespace} {selector}')
                    else:
                        new_selectors.append(selector)
            
            if new_selectors:
                rest_of_line = '{' + '{'.join(parts[1:]) if len(parts) > 1 else ''
                result.append(', '.join(new_selectors) + rest_of_line)
            else:
                result.append(line)
        else:
            result.append(line)
    
    return '\n'.join(result)

# Apply namespaces
print("Applying auth-page namespace...")
auth_css = add_namespace_smart(auth_section, '.auth-page')

print("Applying browse-page namespace...")
browse_css = add_namespace_smart(browse_section, '.browse-page')

print("Applying cart-page namespace...")
cart_css = add_namespace_smart(cart_section, '.cart-page')

print("Applying family-details-page namespace...")
family_details_css = add_namespace_smart(family_details_section, '.family-details-page')

# Combine
final_css = auth_css + browse_css + cart_css + family_details_css

# Write result
with open(r'c:\Users\Shakir\.gemini\antigravity\scratch\karam-platform\styles\pages-core.css', 'w', encoding='utf-8') as f:
    f.write(final_css)

print("✅ Namespacing completed successfully!")
print(f"Total lines: {len(final_css.split(chr(10)))}")
