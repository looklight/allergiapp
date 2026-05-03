{
    const restObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('anim-done');
                restObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.anim-ready:not(.anim-late)').forEach(function(el) {
        restObserver.observe(el);
    });

    const lateObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('anim-done');
                lateObserver.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px 0px -30% 0px', threshold: 0 });

    document.querySelectorAll('.anim-late').forEach(function(el) {
        lateObserver.observe(el);
    });

    const firstCard = document.querySelector('.mock-restaurant-card');
    const autoOpenObserver = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting) {
            firstCard.classList.add('expanded');
            autoOpenObserver.disconnect();
        }
    }, { rootMargin: '0px 0px -50% 0px', threshold: 0 });
    autoOpenObserver.observe(firstCard);

    document.querySelectorAll('.mock-restaurant-card').forEach(function(card) {
        card.addEventListener('click', function() {
            card.classList.toggle('expanded');
        });
    });

    const hiwSteps = document.querySelector('.rest-hiw-steps');
    const hiwDots = document.querySelectorAll('.rest-hiw-dot');
    if (hiwSteps && hiwDots.length) {
        hiwSteps.addEventListener('scroll', function() {
            const index = Math.round(hiwSteps.scrollLeft / hiwSteps.offsetWidth);
            hiwDots.forEach(function(d, i) { d.classList.toggle('active', i === index); });
        }, { passive: true });
    }
}
