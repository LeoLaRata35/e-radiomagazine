document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.querySelector('.nav');

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      nav.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.header-content')) {
        nav.classList.remove('open');
      }
    });
  }

  // ===== NAV DROPDOWN TOGGLE =====
  const dropdownToggles = document.querySelectorAll('.nav-dropdown-toggle');
  dropdownToggles.forEach(function(toggle) {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var parent = toggle.closest('.nav-dropdown');
      if (!parent) return;
      var isOpen = parent.classList.contains('open');
      document.querySelectorAll('.nav-dropdown.open').forEach(function(d) {
        d.classList.remove('open');
      });
      if (!isOpen) parent.classList.add('open');
    });
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.nav-dropdown')) {
      document.querySelectorAll('.nav-dropdown.open').forEach(function(d) {
        d.classList.remove('open');
      });
    }
  });

  // ===== CARGAR M&Aacute;S (sin reemplazar las cards est&aacute;ticas) =====
  const articlesGrid = document.getElementById('articlesGrid');
  const filterTabs = document.getElementById('filterTabs');
  const PER_PAGE = 12;
  let allArticlesCache = null;
  let loadedCount = 12; // partimos de las 12 cards est&aacute;ticas del HTML
  let currentFilter = 'all';

  async function loadAllArticles() {
    if (allArticlesCache) return allArticlesCache;
    try {
      var resp = await fetch('data/articles.json');
      if (!resp.ok) throw new Error('Failed to load articles.json');
      allArticlesCache = await resp.json();
      return allArticlesCache;
    } catch (e) {
      console.error('Error loading articles:', e);
      return [];
    }
  }

  function escapeHTML(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function articleCardHTML(a) {
    return (
      '<article class="article-card" data-category="' + escapeHTML(a.category) + '">' +
        '<div class="article-img" style="background-image: url(\'' + escapeHTML(a.img) + '\');">' +
          '<span class="article-date">' + escapeHTML(a.date) + '</span>' +
        '</div>' +
        '<div class="article-content">' +
          '<span class="article-category">' + escapeHTML(a.categoryLabel) + '</span>' +
          '<h3>' + escapeHTML(a.title) + '</h3>' +
          '<p>' + escapeHTML(a.description) + '</p>' +
          '<a href="' + escapeHTML(a.href) + '" class="read-more">Seguir leyendo</a>' +
        '</div>' +
      '</article>'
    );
  }

  // Ocultar paginaci&oacute;n est&aacute;tica
  var oldPag = document.querySelector('.pagination');
  if (oldPag) oldPag.style.display = 'none';

  // Bot&oacute;n Cargar m&aacute;s
  var loadMoreBtn = document.createElement('button');
  loadMoreBtn.className = 'load-more-btn';
  loadMoreBtn.textContent = 'Cargar m\u00e1s';
  loadMoreBtn.style.cssText = 'display:block;margin:24px auto;padding:12px 32px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:1rem;';
  if (articlesGrid && articlesGrid.parentNode) {
    articlesGrid.parentNode.appendChild(loadMoreBtn);
  }

  function showInitialArticles(articles) {
    // No reemplazamos el grid — solo ocultamos/mostramos el bot&oacute;n
    loadMoreBtn.style.display = articles.length <= PER_PAGE ? 'none' : 'block';
  }

  function loadMore() {
    var articles = currentFilter === 'all' ? allArticlesCache
      : (allArticlesCache || []).filter(function(a) { return a.category === currentFilter; });
    if (!articles) return;
    var next = Math.min(loadedCount + PER_PAGE, articles.length);
    var html = articles.slice(loadedCount, next).map(articleCardHTML).join('\n');
    articlesGrid.insertAdjacentHTML('beforeend', html);
    loadedCount = next;
    animateCards(articlesGrid);
    if (loadedCount >= articles.length) loadMoreBtn.style.display = 'none';
  }

  loadMoreBtn.addEventListener('click', loadMore);

  function animateCards(container) {
    var cards = container.querySelectorAll('.article-card');
    cards.forEach(function(card) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(12px)';
      requestAnimationFrame(function() {
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      });
    });
  }

  // ===== FILTER BY CATEGORY =====
  function filterGridByCategory(filter) {
    if (!articlesGrid || !allArticlesCache) return;
    currentFilter = filter;
    loadMoreBtn.style.display = 'none';
    if (filter === 'all') {
      var toShow = allArticlesCache.slice(0, Math.min(12, allArticlesCache.length));
      articlesGrid.innerHTML = toShow.map(articleCardHTML).join('\n');
      animateCards(articlesGrid);
      loadedCount = toShow.length;
      loadMoreBtn.style.display = allArticlesCache.length > loadedCount ? 'block' : 'none';
    } else {
      var matching = allArticlesCache.filter(function(a) { return a.category === filter; });
      if (matching.length > 0) {
        articlesGrid.innerHTML = matching.map(articleCardHTML).join('\n');
        animateCards(articlesGrid);
      } else {
        articlesGrid.innerHTML = '<p class="no-results">No hay artículos en esta categoría.</p>';
      }
    }
  }

  if (filterTabs && articlesGrid) {
    filterTabs.addEventListener('click', function(e) {
      var btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filterTabs.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      filterGridByCategory(btn.dataset.filter);
    });
  }

  function applyFilter(filter) {
    var targetBtn = filterTabs ? Array.from(filterTabs.querySelectorAll('.filter-btn')).find(function(b) { return b.dataset.filter === filter; }) : null;
    if (targetBtn) targetBtn.click();
  }

  const navLinks = document.querySelectorAll('.nav a[data-filter]');
  navLinks.forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      navLinks.forEach(function(l) { l.classList.remove('active'); });
      link.classList.add('active');
      if (nav) nav.classList.remove('open');
      applyFilter(link.dataset.filter);
      var main = document.querySelector('.main');
      if (main) main.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // ===== NEWSLETTER (no-op safe) =====
  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = newsletterForm.querySelector('input[type="email"]');
      const btn = newsletterForm.querySelector('button');
      const originalText = btn.textContent;
      btn.textContent = '¡Suscrito!';
      btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      input.value = '';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
      }, 3000);
    });
  }

  // ===== SEARCH =====
  const searchToggle = document.getElementById('searchToggle');
  const searchPanel = document.getElementById('searchPanel');
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');

  if (searchToggle && searchPanel) {
    searchToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      searchPanel.classList.toggle('open');
      if (searchPanel.classList.contains('open')) {
        setTimeout(function() { if (searchInput) searchInput.focus(); }, 100);
      }
    });
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.search-panel') && !e.target.closest('#searchToggle')) {
        searchPanel.classList.remove('open');
      }
    });
  }

  if (searchInput && searchResults) {
    var searchTimeout = null;
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function() {
        var q = searchInput.value.trim().toLowerCase();
        if (!q) { searchResults.innerHTML = ''; searchResults.classList.remove('has-results'); return; }
        if (!allArticlesCache) return;
        var matches = allArticlesCache.filter(function(a) {
          var text = (a.title || '') + ' ' + (a.description || '') + ' ' + (a.categoryLabel || '');
          return text.toLowerCase().indexOf(q) !== -1;
        });
        if (matches.length === 0) {
          searchResults.innerHTML = '<div class="search-result-item no-results">Sin resultados</div>';
        } else {
          searchResults.innerHTML = matches.slice(0, 20).map(function(a) {
            return '<a href="' + escapeHTML(a.href) + '" class="search-result-item">' +
              '<img src="' + escapeHTML(a.img) + '" alt="">' +
              '<div class="search-result-info">' +
                '<span>' + escapeHTML(a.categoryLabel) + '</span>' +
                '<h4>' + escapeHTML(a.title) + '</h4>' +
              '</div></a>';
          }).join('');
        }
        searchResults.classList.add('has-results');
      }, 200);
    });
  }

  // ===== BANNER CAROUSEL =====
  (function initBannerCarousel() {
    var track = document.getElementById('bannerTrack');
    var dots = document.querySelectorAll('.banner-dot');
    if (!track || !dots.length) return;
    var current = 0;
    track.style.transform = 'translateX(0%)';
    function goToSlide(idx) {
      current = idx;
      track.style.transform = 'translateX(-' + (idx * 100) + '%)';
      dots.forEach(function(d, i) { d.classList.toggle('active', i === idx); });
    }
    dots.forEach(function(dot) {
      dot.addEventListener('click', function() { goToSlide(parseInt(dot.dataset.slide)); });
    });
    setInterval(function() { goToSlide((current + 1) % dots.length); }, 5000);
  })();

  // ===== HERO CAROUSEL (Most Read) =====
  var heroCarousel = document.getElementById('heroCarousel');
  var heroSide = document.getElementById('heroSide');
  var carouselDots = document.getElementById('carouselDots');
  var currentSlide = 0;
  var slideInterval = null;

  function buildHero(articles) {
    if (!heroCarousel || !articles.length) return;
    var top5 = articles.slice(0, 5);
    var next3 = articles.slice(5, 8);

    heroCarousel.querySelectorAll('.hero-slide').forEach(function(el) { el.remove(); });

    top5.forEach(function(a, i) {
      var slide = document.createElement('div');
      slide.className = 'hero-slide' + (i === 0 ? ' active' : '');
      slide.dataset.slide = i;
      slide.style.cssText = "background-image: linear-gradient(180deg, rgba(15,15,19,0.5) 0%, rgba(15,15,19,0.8) 100%), url('" + a.img + "'); background-size: cover; background-position: center;";
      slide.innerHTML =
        '<div class="hero-category">' + escapeHTML(a.categoryLabel) + '</div>' +
        '<h1>' + escapeHTML(a.title) + '</h1>' +
        '<a href="' + escapeHTML(a.href) + '" class="btn-read">Leer más →</a>';
      heroCarousel.insertBefore(slide, carouselDots);
    });

    if (carouselDots) {
      carouselDots.innerHTML = '';
      top5.forEach(function(a, i) {
        var dot = document.createElement('span');
        dot.className = 'dot' + (i === 0 ? ' active' : '');
        dot.dataset.slide = i;
        carouselDots.appendChild(dot);
      });
    }

    if (heroSide) {
      heroSide.innerHTML = '';
      next3.forEach(function(a) {
        var item = document.createElement('a');
        item.href = a.href;
        item.className = 'hero-item';
        item.style.cssText = "background-image: linear-gradient(180deg, rgba(15,15,19,0.7), rgba(15,15,19,0.9)), url('" + a.img + "'); background-size: cover; background-position: center; text-decoration: none; color: inherit;";
        item.innerHTML =
          '<div class="hero-item-category">' + escapeHTML(a.categoryLabel) + '</div>' +
          '<h3>' + escapeHTML(a.title) + '</h3>';
        heroSide.appendChild(item);
      });
    }

    initHeroCarousel();
  }

  function initHeroCarousel() {
    var slides = heroCarousel.querySelectorAll('.hero-slide');
    var dots = heroCarousel.querySelectorAll('.dot');
    if (!slides.length) return;
    currentSlide = 0;

    function goToSlide(index) {
      slides.forEach(function(s) { s.classList.remove('active'); });
      dots.forEach(function(d) { d.classList.remove('active'); });
      currentSlide = (index + slides.length) % slides.length;
      slides[currentSlide].classList.add('active');
      dots[currentSlide].classList.add('active');
    }

    function nextSlide() { goToSlide(currentSlide + 1); }
    function startAutoplay() {
      stopAutoplay();
      slideInterval = setInterval(nextSlide, 5000);
    }
    function stopAutoplay() {
      if (slideInterval) { clearInterval(slideInterval); slideInterval = null; }
    }

    dots.forEach(function(dot) {
      dot.addEventListener('click', function() {
        goToSlide(parseInt(dot.dataset.slide));
        startAutoplay();
      });
    });

    if (heroCarousel) {
      heroCarousel.addEventListener('mouseenter', stopAutoplay);
      heroCarousel.addEventListener('mouseleave', startAutoplay);
    }

    startAutoplay();
  }

  // ===== INIT: cargar artículos, contar estáticas, mostrar hero =====
  loadAllArticles().then(function(articles) {
    allArticlesCache = articles;
    if (articlesGrid) {
      // Contar cuántas cards estáticas ya hay en el HTML
      var staticCards = articlesGrid.querySelectorAll('.article-card');
      loadedCount = staticCards.length;
      showInitialArticles(articles);
    }
    buildHero(articles);
  });
});

// ===== GLOBAL CAROUSEL FUNCTIONS FOR ARTICLE CAROUSELS (e-carousel) =====
(function() {
  window.ecState = {};

  window.ecPrev = function(id) {
    if (!window.ecState[id]) window.ecState[id] = 0;
    var total = parseInt(document.getElementById(id).dataset.total, 10);
    window.ecState[id] = Math.max(0, window.ecState[id] - 1);
    ecUpdate(id);
  };

  window.ecNext = function(id) {
    if (!window.ecState[id]) window.ecState[id] = 0;
    var total = parseInt(document.getElementById(id).dataset.total, 10);
    window.ecState[id] = Math.min(total - 1, window.ecState[id] + 1);
    ecUpdate(id);
  };

  window.ecGo = function(id, idx) {
    window.ecState[id] = idx;
    ecUpdate(id);
  };

  function ecUpdate(id) {
    var idx = window.ecState[id] || 0;
    var track = document.getElementById(id + '-track');
    if (track) {
      track.style.transform = 'translateX(-' + (idx * 100) + '%)';
    }
    var dots = document.querySelectorAll('#' + id + '-dots .e-carousel-dot');
    dots.forEach(function(d, i) {
      d.classList.toggle('active', i === idx);
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    var ecFigs = document.querySelectorAll('.e-carousel');
    ecFigs.forEach(function(fig) {
      var prevBtn = fig.querySelector('.e-carousel-prev');
      var nextBtn = fig.querySelector('.e-carousel-next');
      if (prevBtn) { prevBtn.removeAttribute('onclick'); prevBtn.addEventListener('click', function() { ecPrev(fig.id); }); }
      if (nextBtn) { nextBtn.removeAttribute('onclick'); nextBtn.addEventListener('click', function() { ecNext(fig.id); }); }
      fig.querySelectorAll('.e-carousel-dot').forEach(function(dot, i) {
        dot.removeAttribute('onclick');
        dot.addEventListener('click', function() { ecGo(fig.id, i); });
      });
      ecUpdate(fig.id);
    });
  });
});