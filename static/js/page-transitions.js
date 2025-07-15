
// BELWEST - Smooth Page Transitions
class PageTransitions {
    constructor() {
        this.overlay = null;
        this.isTransitioning = false;
        this.init();
    }

    init() {
        this.createOverlay();
        this.bindMenuEvents();
        this.handleInitialLoad();
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'page-transition-overlay';
        this.overlay.innerHTML = `
            <div class="transition-spinner"></div>
            <div class="transition-text">BELWEST<br>Загрузка...</div>
        `;
        document.body.appendChild(this.overlay);
    }

    bindMenuEvents() {
        const menuLinks = document.querySelectorAll('.menu a');
        menuLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.isTransitioning) {
                    this.navigate(link.href);
                }
            });
        });
    }

    async navigate(url) {
        if (this.isTransitioning) return;
        
        this.isTransitioning = true;
        
        // Show transition overlay
        this.showOverlay();
        
        // Update active menu item
        this.updateActiveMenu(url);
        
        // Fade out current content
        await this.fadeOutContent();
        
        // Simulate loading time for smooth UX
        await this.delay(300);
        
        // Navigate to new page
        window.location.href = url;
    }

    showOverlay() {
        this.overlay.classList.add('active');
    }

    hideOverlay() {
        this.overlay.classList.remove('active');
        this.isTransitioning = false;
    }

    async fadeOutContent() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.classList.add('loading');
        }
        return this.delay(300);
    }

    fadeInContent() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.classList.remove('loading');
            mainContent.classList.add('loaded');
            
            // Add stagger animation to cards
            const cards = document.querySelectorAll('.card');
            cards.forEach((card, index) => {
                card.style.animationDelay = `${index * 0.1}s`;
            });
        }
    }

    updateActiveMenu(url) {
        const menuItems = document.querySelectorAll('.menu li');
        menuItems.forEach(item => {
            item.classList.remove('active');
        });

        // Find and activate current menu item
        const currentItem = Array.from(menuItems).find(item => {
            const link = item.querySelector('a');
            return link && link.href === url;
        });

        if (currentItem) {
            currentItem.classList.add('active');
        }
    }

    handleInitialLoad() {
        // Hide overlay and animate content on page load
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.hideOverlay();
                this.fadeInContent();
                this.setActiveMenuFromURL();
            }, 100);
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', () => {
            this.handleInitialLoad();
        });
    }

    setActiveMenuFromURL() {
        const currentPath = window.location.pathname;
        const menuItems = document.querySelectorAll('.menu li');
        
        menuItems.forEach(item => {
            item.classList.remove('active');
            const link = item.querySelector('a');
            if (link) {
                const linkPath = new URL(link.href).pathname;
                if (linkPath === currentPath || 
                    (currentPath === '/' && linkPath === '/') ||
                    (currentPath.includes(linkPath) && linkPath !== '/')) {
                    item.classList.add('active');
                }
            }
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Method to handle AJAX content loading (alternative to full page navigation)
    async loadContentAjax(url) {
        if (this.isTransitioning) return;
        
        this.isTransitioning = true;
        this.showOverlay();
        
        try {
            const response = await fetch(url);
            const html = await response.text();
            
            // Parse the response to get main content
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newContent = doc.querySelector('.main-content');
            
            if (newContent) {
                await this.fadeOutContent();
                
                // Replace content
                const currentContent = document.querySelector('.main-content');
                if (currentContent) {
                    currentContent.innerHTML = newContent.innerHTML;
                }
                
                // Update URL without reload
                history.pushState({}, '', url);
                
                // Update active menu
                this.updateActiveMenu(url);
                
                await this.delay(200);
                this.hideOverlay();
                this.fadeInContent();
                
                // Re-initialize any page-specific scripts
                this.initializePageScripts();
            }
        } catch (error) {
            console.error('Error loading content:', error);
            window.location.href = url; // Fallback to full page load
        }
    }

    initializePageScripts() {
        // Re-run any page-specific initialization
        if (typeof initializeCharts === 'function') {
            initializeCharts();
        }
        if (typeof initializeForms === 'function') {
            initializeForms();
        }
    }
}

// Initialize smooth transitions
document.addEventListener('DOMContentLoaded', () => {
    new PageTransitions();
    
    // Add loading class initially
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.classList.add('loading');
    }
});

// Enhanced menu hover effects
document.addEventListener('DOMContentLoaded', () => {
    const menuItems = document.querySelectorAll('.menu li a');
    
    menuItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(8px) scale(1.02)';
        });
        
        item.addEventListener('mouseleave', function() {
            if (!this.parentElement.classList.contains('active')) {
                this.style.transform = 'translateX(0) scale(1)';
            }
        });
    });
});

// Preloader for images and assets
class AssetPreloader {
    constructor() {
        this.loadedAssets = 0;
        this.totalAssets = 0;
        this.preloadImages();
    }
    
    preloadImages() {
        const images = document.querySelectorAll('img[data-src]');
        this.totalAssets = images.length;
        
        if (this.totalAssets === 0) return;
        
        images.forEach(img => {
            const realImg = new Image();
            realImg.onload = () => {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                this.loadedAssets++;
                this.updateProgress();
            };
            realImg.src = img.dataset.src;
        });
    }
    
    updateProgress() {
        const progress = (this.loadedAssets / this.totalAssets) * 100;
        // You can add a progress bar here if needed
        if (progress === 100) {
            document.body.classList.add('assets-loaded');
        }
    }
}

// Initialize asset preloader
document.addEventListener('DOMContentLoaded', () => {
    new AssetPreloader();
});
