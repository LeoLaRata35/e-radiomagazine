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

  // ===== CROSS-PAGE CATEGORY FILTER =====
  const filterTabs = document.getElementById('filterTabs');
  const articlesGrid = document.getElementById('articlesGrid');
  const pagination = document.querySelector('.pagination');
  let originalGridHTML = articlesGrid ? articlesGrid.innerHTML : '';
  let allArticlesCache = null;

  const allPageNames = ['index.html', 'page2.html', 'page3.html', 'page4.html'];

  function currentPageName() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function extractArticleData(html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    return Array.from(div.querySelectorAll('.article-card')).map(function(card) {
      return { html: card.outerHTML, category: card.dataset.category };
    });
  }

  async function fetchAllArticles() {
    if (allArticlesCache) return allArticlesCache;

    var current = extractArticleData(document.documentElement.outerHTML);
    var currentName = currentPageName();

    var otherPromises = allPageNames
      .filter(function(p) { return p !== currentName; })
      .map(async function(p) {
        try {
          var resp = await fetch(p);
          if (!resp.ok) return [];
          return extractArticleData(await resp.text());
        } catch(e) {
          return [];
        }
      });

    var others = await Promise.all(otherPromises);
    allArticlesCache = current;
    others.forEach(function(arr) {
      allArticlesCache = allArticlesCache.concat(arr);
    });
    return allArticlesCache;
  }

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

  function filterGridByCategory(filter) {
    if (!articlesGrid) return;

    if (filter === 'all') {
      articlesGrid.innerHTML = originalGridHTML;
      if (pagination) pagination.style.display = '';
      animateCards(articlesGrid);
      return;
    }

    fetchAllArticles().then(function(all) {
      var matching = all.filter(function(a) { return a.category === filter; });
      if (matching.length > 0) {
        articlesGrid.innerHTML = matching.map(function(a) { return a.html; }).join('\n');
        animateCards(articlesGrid);
        if (pagination) pagination.style.display = 'none';
      } else {
        articlesGrid.innerHTML = '<p class="no-results">No hay artículos en esta categoría.</p>';
        if (pagination) pagination.style.display = 'none';
      }
    });
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
    if (targetBtn) {
      targetBtn.click();
    }
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

  // ===== CAROUSEL STATE =====
  var currentSlide = 0;
  var slideInterval = null;

  // ===== MOST READ + VIEW COUNTS =====
  loadMostRead();

  function loadMostRead() {
    var cards = document.querySelectorAll('.article-card');
    if (!cards.length) return;

    var articles = [];
    cards.forEach(function(card) {
      var imgDiv = card.querySelector('.article-img');
      var link = card.querySelector('.read-more');
      var href = link ? link.getAttribute('href') : '';
      var filename = href.replace('articulos/', '').replace('.html', '');
      var bgStyle = imgDiv ? imgDiv.getAttribute('style') || '' : '';
      var imgMatch = bgStyle.match(/url\(['"]?(.*?)['"]?\)/);
      var img = imgMatch ? imgMatch[1] : '';
      var title = card.querySelector('h3') ? card.querySelector('h3').textContent : '';
      var catEl = card.querySelector('.article-category');
      var category = catEl ? catEl.textContent : '';
      var dateEl = imgDiv ? imgDiv.querySelector('.article-date') : null;
      var date = dateEl ? dateEl.textContent : '';
      articles.push({ filename: filename, img: img, title: title, category: category, href: href, date: date, card: card, imgDiv: imgDiv, count: 0 });
    });

    buildCarousel(articles);
    initCarousel();
  }

  function buildCarousel(articles) {
    var heroCarousel = document.getElementById('heroCarousel');
    var heroSide = document.getElementById('heroSide');
    var dotsContainer = document.getElementById('carouselDots');
    if (!heroCarousel || articles.length === 0) return;

    var top5 = articles.slice(0, 5);
    var next3 = articles.slice(5, 8);

    heroCarousel.querySelectorAll('.hero-slide').forEach(function(el) { el.remove(); });

    top5.forEach(function(a, i) {
      var slide = document.createElement('div');
      slide.className = 'hero-slide' + (i === 0 ? ' active' : '');
      slide.dataset.slide = i;
      slide.style.cssText = "background-image: linear-gradient(180deg, rgba(15,15,19,0.5) 0%, rgba(15,15,19,0.8) 100%), url('" + a.img + "'); background-size: cover; background-position: center;";
      slide.innerHTML =
        '<div class="hero-category">' + a.category + '</div>' +
        '<h1>' + a.title + '</h1>' +
        '<a href="' + a.href + '" class="btn-read">Leer m&aacute;s &rarr;</a>';
      heroCarousel.insertBefore(slide, dotsContainer);
    });

    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      top5.forEach(function(a, i) {
        var dot = document.createElement('span');
        dot.className = 'dot' + (i === 0 ? ' active' : '');
        dot.dataset.slide = i;
        dotsContainer.appendChild(dot);
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
          '<div class="hero-item-category">' + a.category + '</div>' +
          '<h3>' + a.title + '</h3>';
        heroSide.appendChild(item);
      });
    }
  }

  // ===== CAROUSEL =====
  function initCarousel() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.dot');
    const heroCarousel = document.getElementById('heroCarousel');
    if (!slides.length || !dots.length) return;

    currentSlide = 0;

    function goToSlide(index) {
      slides.forEach(s => s.classList.remove('active'));
      dots.forEach(d => d.classList.remove('active'));
      currentSlide = (index + slides.length) % slides.length;
      slides[currentSlide].classList.add('active');
      dots[currentSlide].classList.add('active');
    }

    function nextSlide() {
      goToSlide(currentSlide + 1);
    }

    function startAutoplay() {
      stopAutoplay();
      slideInterval = setInterval(nextSlide, 5000);
    }

    function stopAutoplay() {
      if (slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
      }
    }

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
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

  // Auto-fix existing carousels on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function() {
    var ecFigs = document.querySelectorAll('.e-carousel');
    var ecIndex = 0;
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
})();
