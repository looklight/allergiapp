// Smooth scroll for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add scroll effect to navigation
let lastScroll = 0;
const nav = document.querySelector('.nav');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        nav.style.boxShadow = '0 2px 12px rgba(0,0,0,0.1)';
    } else {
        nav.style.boxShadow = 'none';
    }

    lastScroll = currentScroll;
});

// Animate on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translate(0, 0)';
        }
    });
}, observerOptions);

// Observe all cards and features
document.querySelectorAll('.step, .feature-highlights').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Observe features logo with scale animation
document.querySelectorAll('.features-logo').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'scale(0.5)';
    el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    observer.observe(el);
});

// Observe timeline items with sequential animation
document.querySelectorAll('.timeline-item').forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    el.style.transitionDelay = `${index * 0.2}s`;
    observer.observe(el);
});

// Back to top button
const backToTopButton = document.getElementById('backToTop');
if (backToTopButton) {
    backToTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Easter egg: seleziona formaggio, grano, latte, uova per il piatto super felice
(function() {
    const easterEggKeys = ['img_cheese.png', 'img_wheat.png', 'img_milk.png', 'img_egg.png'];
    const selected = new Set();
    const orbit = document.querySelector('.allergen-orbit');

    if (!orbit) return;

    function resetSelection() {
        selected.clear();
        orbit.querySelectorAll('.allergen-item.selected').forEach(el => {
            el.classList.remove('selected');
        });
    }

    orbit.querySelectorAll('.allergen-item').forEach(item => {
        const src = item.querySelector('img').getAttribute('src');
        const filename = src.split('/').pop();
        const isEasterEgg = easterEggKeys.includes(filename);

        item.addEventListener('click', () => {
            if (!isEasterEgg) {
                resetSelection();
                return;
            }

            item.classList.toggle('selected');

            if (item.classList.contains('selected')) {
                selected.add(filename);
            } else {
                selected.delete(filename);
            }

            if (easterEggKeys.every(key => selected.has(key))) {
                orbit.classList.add('easter-egg');
            }
        });
    });
})();

// Allergens Carousel - Pause on hover
const carousel = document.querySelector('.allergens-carousel');

if (carousel) {
    carousel.addEventListener('mouseenter', () => {
        carousel.style.animationPlayState = 'paused';
    });

    carousel.addEventListener('mouseleave', () => {
        carousel.style.animationPlayState = 'running';
    });
}
