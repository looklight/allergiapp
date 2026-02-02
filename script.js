// Smooth scroll for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
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

// Allergens Carousel
const carousel = document.querySelector('.allergens-carousel');
const prevButton = document.querySelector('.carousel-control.prev');
const nextButton = document.querySelector('.carousel-control.next');
const dotsContainer = document.querySelector('.carousel-dots');

if (carousel && prevButton && nextButton && dotsContainer) {
    const badges = carousel.querySelectorAll('.allergen-badge');
    const itemsToShow = window.innerWidth <= 768 ? 2 : 4;
    const totalPages = Math.ceil(badges.length / itemsToShow);
    let currentPage = 0;
    let autoScrollInterval;
    let isUserInteracting = false;

    // Create dots
    for (let i = 0; i < totalPages; i++) {
        const dot = document.createElement('div');
        dot.className = 'carousel-dot';
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => scrollToPage(i));
        dotsContainer.appendChild(dot);
    }

    const dots = dotsContainer.querySelectorAll('.carousel-dot');

    function scrollToPage(page) {
        currentPage = page;
        const badgeWidth = badges[0].offsetWidth;
        const gap = 16;
        const scrollAmount = page * itemsToShow * (badgeWidth + gap);
        carousel.scrollTo({
            left: scrollAmount,
            behavior: 'smooth'
        });
        updateDots();
    }

    function updateDots() {
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentPage);
        });
    }

    function nextPage() {
        currentPage = (currentPage + 1) % totalPages;
        scrollToPage(currentPage);
    }

    function prevPage() {
        currentPage = (currentPage - 1 + totalPages) % totalPages;
        scrollToPage(currentPage);
    }

    // Auto scroll
    function startAutoScroll() {
        if (!isUserInteracting) {
            autoScrollInterval = setInterval(() => {
                if (!isUserInteracting) {
                    nextPage();
                }
            }, 3000);
        }
    }

    function stopAutoScroll() {
        clearInterval(autoScrollInterval);
    }

    // Event listeners
    prevButton.addEventListener('click', () => {
        isUserInteracting = true;
        stopAutoScroll();
        prevPage();
        setTimeout(() => {
            isUserInteracting = false;
            startAutoScroll();
        }, 5000);
    });

    nextButton.addEventListener('click', () => {
        isUserInteracting = true;
        stopAutoScroll();
        nextPage();
        setTimeout(() => {
            isUserInteracting = false;
            startAutoScroll();
        }, 5000);
    });

    carousel.addEventListener('touchstart', () => {
        isUserInteracting = true;
        stopAutoScroll();
    });

    carousel.addEventListener('touchend', () => {
        setTimeout(() => {
            isUserInteracting = false;
            startAutoScroll();
        }, 5000);
    });

    carousel.addEventListener('mouseenter', () => {
        isUserInteracting = true;
        stopAutoScroll();
    });

    carousel.addEventListener('mouseleave', () => {
        isUserInteracting = false;
        startAutoScroll();
    });

    // Start auto scroll
    startAutoScroll();
}
