/* Barra "Compartir" de los artículos.
   Toma la URL y el título de la página para no duplicar nada en cada HTML. */
(function () {
  var bar = document.querySelector('.share-bar');
  if (!bar) return;

  var url = location.href.split('#')[0];
  var title = document.title;
  var enc = encodeURIComponent;

  var links = {
    facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + enc(url),
    x: 'https://twitter.com/intent/tweet?url=' + enc(url) + '&text=' + enc(title),
    whatsapp: 'https://wa.me/?text=' + enc(title + ' ' + url),
    telegram: 'https://t.me/share/url?url=' + enc(url) + '&text=' + enc(title)
  };

  document.querySelectorAll('.share-bar [data-share]').forEach(function (el) {
    var key = el.getAttribute('data-share');

    if (links[key]) {
      el.href = links[key];
      return;
    }

    if (key === 'copy') {
      el.addEventListener('click', function () {
        var done = function () {
          if (!el.dataset.originalLabel) el.dataset.originalLabel = el.getAttribute('aria-label') || '';
          el.setAttribute('aria-label', '¡Enlace copiado!');
          el.classList.add('is-copied');
          var msg = bar.querySelector('.share-bar__msg');
          if (msg) {
            msg.classList.add('show');
            setTimeout(function () { msg.classList.remove('show'); }, 2200);
          }
          setTimeout(function () {
            el.setAttribute('aria-label', el.dataset.originalLabel);
            el.classList.remove('is-copied');
          }, 2200);
        };

        var fallback = function () {
          var ta = document.createElement('textarea');
          ta.value = url;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); done(); } catch (e) { /* sin permiso */ }
          document.body.removeChild(ta);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(done, fallback);
        } else {
          fallback();
        }
      });
    }
  });
})();
