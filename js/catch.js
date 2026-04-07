// Add cache-busting timestamp to CSS links
window.addEventListener('DOMContentLoaded', () => {
    const timestamp = Date.now(); // Get current timestamp
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    
    links.forEach(link => {
        const originalHref = link.getAttribute('href');
        if (originalHref) {
            const newHref = `${originalHref}?v=${timestamp}`;

            // Preload the new CSS file
            const preloadLink = document.createElement('link');
            preloadLink.rel = 'stylesheet';
            preloadLink.href = newHref;

            // Append the new link element to the head
            preloadLink.onload = () => {
                // Replace the old link only after the new one is loaded
                link.setAttribute('href', newHref);
            };

            document.head.appendChild(preloadLink);
        }
    });
});

