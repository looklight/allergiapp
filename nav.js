// Header su telefono: l'hamburger apre il pannello con Card, Ristoranti, Contatti.
(function () {
    var nav = document.querySelector('.nav');
    var btn = nav && nav.querySelector('.nav-toggle');
    if (!btn) return;

    function setOpen(open) {
        nav.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    btn.addEventListener('click', function () {
        setOpen(!nav.classList.contains('is-open'));
    });

    // Scegliere una voce (anche un'àncora della stessa pagina) chiude il pannello
    nav.querySelectorAll('.nav-main a').forEach(function (a) {
        a.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('click', function (e) {
        if (!nav.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') setOpen(false);
    });

    // Tornando a uno schermo largo il pannello non deve restare "aperto"
    window.matchMedia('(min-width: 769px)').addEventListener('change', function () { setOpen(false); });
})();
