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

  const navLinks = document.querySelectorAll('.nav a[data-filter]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      if (nav) nav.classList.remove('open');

      const filter = link.dataset.filter;
      applyFilter(filter);

      const main = document.querySelector('.main');
      if (main) main.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const filterTabs = document.getElementById('filterTabs');
  const articlesGrid = document.getElementById('articlesGrid');
  const articles = articlesGrid?.querySelectorAll('.article-card');

  if (filterTabs && articles) {
    filterTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;

      filterTabs.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;

      articles.forEach(card => {
        if (filter === 'all' || card.dataset.category === filter) {
          card.style.display = '';
          card.style.opacity = '0';
          card.style.transform = 'translateY(12px)';
          requestAnimationFrame(() => {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          });
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(12px)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 300);
        }
      });
    });
  }

  function applyFilter(filter) {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const targetBtn = Array.from(filterBtns).find(b => b.dataset.filter === filter);
    if (targetBtn) {
      filterBtns.forEach(b => b.classList.remove('active'));
      targetBtn.classList.add('active');
      targetBtn.click();
    }
  }

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

  // ===== MOST READ + VIEW COUNTS =====
  loadMostRead();

  async function loadMostRead() {
    const cards = document.querySelectorAll('.article-card');
    if (!cards.length) return;

    const articles = [];
    cards.forEach(card => {
      const imgDiv = card.querySelector('.article-img');
      const link = card.querySelector('.read-more');
      const href = link ? link.getAttribute('href') : '';
      const filename = href.replace('articulos/', '').replace('.html', '');
      const bgStyle = imgDiv ? imgDiv.getAttribute('style') || '' : '';
      const imgMatch = bgStyle.match(/url\(['"]?(.*?)['"]?\)/);
      const img = imgMatch ? imgMatch[1] : '';
      const title = card.querySelector('h3')?.textContent || '';
      const catEl = card.querySelector('.article-category');
      const category = catEl ? catEl.textContent : '';
      const dateEl = imgDiv ? imgDiv.querySelector('.article-date') : null;
      const date = dateEl ? dateEl.textContent : '';
      articles.push({ filename, img, title, category, href, date, card, imgDiv, count: 0 });
    });

    articles.forEach(a => {
      if (!a.imgDiv) return;
      const vc = document.createElement('span');
      vc.className = 'view-count';
      vc.innerHTML = '<span class="eye-icon">&#x1F441;</span> 0';
      a.imgDiv.appendChild(vc);
    });

    buildCarousel(articles);
    initCarousel();

    const controller = new AbortController();
    const timeout = setTimeout(function() { controller.abort(); }, 4000);

    try {
      const countPromises = articles.map(function(a) {
        return fetch('https://api.countapi.xyz/get/eradiomagazine/' + a.filename, { signal: controller.signal })
          .then(function(r) { return r.json(); })
          .then(function(d) { a.count = d.value || 0; return a; })
          .catch(function() { a.count = 0; return a; });
      });
      var results = await Promise.all(countPromises);
      clearTimeout(timeout);
      results.sort(function(a, b) { return b.count - a.count; });

      results.forEach(function(a) {
        if (!a.imgDiv) return;
        var existing = a.imgDiv.querySelector('.view-count');
        if (existing) existing.remove();
        var vc = document.createElement('span');
        vc.className = 'view-count';
        vc.innerHTML = '<span class="eye-icon">&#x1F441;</span> ' + a.count;
        a.imgDiv.appendChild(vc);
      });

      buildCarousel(results);
      initCarousel();
    } catch(e) {
      clearTimeout(timeout);
    }
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
  let currentSlide = 0;
  let slideInterval = null;

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
