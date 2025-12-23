/**
 * Components Loader
 * Automatically loads header and footer components into pages
 */

// Load component from file
async function loadComponent(elementId, componentPath) {
    try {
        const response = await fetch(componentPath);
        if (!response.ok) {
            console.error(`Failed to load component: ${componentPath}`);
            return;
        }
        const html = await response.text();
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading component:', error);
    }
}

// Load all components
async function loadAllComponents() {
    // Load header if container exists
    if (document.getElementById('header-container')) {
        await loadComponent('header-container', 'components/header.html');
    }

    // Load footer if container exists
    if (document.getElementById('footer-container')) {
        await loadComponent('footer-container', 'components/footer.html');
    }

    // Trigger language update after components are loaded
    if (typeof updatePageTranslations === 'function') {
        setTimeout(updatePageTranslations, 100);
    }
}

// Auto-load on DOM ready
document.addEventListener('DOMContentLoaded', loadAllComponents);
