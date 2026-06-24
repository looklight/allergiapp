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

    const mockCards = document.querySelectorAll('.mock-restaurant-card');
    const firstCard = mockCards[0];
    const secondCard = mockCards[1];
    const autoOpenObserver = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting) {
            firstCard.classList.add('expanded');
            // Dopo l'apertura della prima, suggerisci di aprire la seconda con un tap hint
            if (secondCard) {
                setTimeout(function() {
                    if (!secondCard.classList.contains('expanded')) {
                        secondCard.classList.add('show-tap-hint');
                    }
                }, 1100);
            }
            autoOpenObserver.disconnect();
        }
    }, { rootMargin: '0px 0px -50% 0px', threshold: 0 });
    autoOpenObserver.observe(firstCard);

    mockCards.forEach(function(card) {
        card.addEventListener('click', function() {
            card.classList.toggle('expanded');
            card.classList.remove('show-tap-hint');
        });
    });
}
