/* ==========================================================================
   Салон красоты — интерактив
   Шапка, меню, появление блоков, слайдер отзывов, модальные окна,
   форма онлайн-записи, карта, галерея.
   ========================================================================== */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const body = doc.body;
  const $ = (sel, ctx = doc) => ctx.querySelector(sel);
  const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pad2 = (n) => String(n).padStart(2, '0');

  /* ---------- Блокировка прокрутки (меню и модальные окна) ---------- */
  let lockDepth = 0;
  function lockScroll() {
    if (lockDepth++ === 0) {
      body.style.setProperty('--sbw', `${window.innerWidth - root.clientWidth}px`);
      body.classList.add('is-locked');
    }
  }
  function unlockScroll() {
    if (lockDepth > 0 && --lockDepth === 0) {
      body.classList.remove('is-locked');
      body.style.removeProperty('--sbw');
    }
  }

  /* ---------- Шапка ---------- */
  const header = $('#header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Мобильное меню ---------- */
  const nav = $('#nav');
  const burger = $('.burger');
  const navOverlay = $('[data-nav-close]');
  const menuQuery = window.matchMedia('(max-width: 1180px)');
  let menuOpen = false;

  function setMenu(open) {
    if (open === menuOpen) return;
    menuOpen = open;
    nav.classList.toggle('is-open', open);
    navOverlay.classList.toggle('is-open', open);
    header.classList.toggle('is-menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    if (open) {
      lockScroll();
      const first = $('.nav__link', nav);
      if (first) setTimeout(() => first.focus({ preventScroll: true }), 350);
    } else {
      unlockScroll();
    }
  }

  burger.addEventListener('click', () => setMenu(!menuOpen));
  navOverlay.addEventListener('click', () => setMenu(false));
  nav.addEventListener('click', (e) => {
    if (menuOpen && e.target.closest('a, button')) setMenu(false);
  });
  const onMenuQuery = (e) => { if (!e.matches) setMenu(false); };
  if (menuQuery.addEventListener) menuQuery.addEventListener('change', onMenuQuery);
  else menuQuery.addListener(onMenuQuery);

  /* ---------- Подсветка пункта меню текущего раздела ---------- */
  const spyTargets = ['top', 'services', 'masters', 'reviews', 'contacts']
    .map((id) => doc.getElementById(id))
    .filter(Boolean);
  const navLinks = $$('.nav__link[href^="#"]');
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navLinks.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    spyTargets.forEach((el) => spy.observe(el));
  }

  /* ---------- Плавное появление блоков ---------- */
  const revealEls = $$('[data-reveal]');
  if (!('IntersectionObserver' in window) || reduceMotion.matches) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Слайдер отзывов ---------- */
  $$('[data-slider]').forEach((slider) => {
    const viewport = $('.slider__viewport', slider);
    const track = $('.slider__track', slider);
    const slides = $$('.slider__slide', slider);
    const prevBtn = $('[data-slider-prev]', slider);
    const nextBtn = $('[data-slider-next]', slider);
    const dotsWrap = $('[data-slider-dots]', slider);
    const AUTOPLAY_MS = 6500;

    let index = 0;
    let perView = 1;
    let maxIndex = 0;
    let timer = null;
    let hovered = false;
    let focused = false;
    let inView = false;

    const stepSize = () => (slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : 0);

    function buildDots() {
      if (dotsWrap.children.length === maxIndex + 1) return;
      dotsWrap.innerHTML = '';
      for (let i = 0; i <= maxIndex; i += 1) {
        const dot = doc.createElement('button');
        dot.type = 'button';
        dot.className = 'slider__dot';
        dot.setAttribute('aria-label', `Отзывы, страница ${i + 1}`);
        dot.addEventListener('click', () => { go(i); restart(); });
        dotsWrap.appendChild(dot);
      }
      dotsWrap.hidden = maxIndex === 0;
    }

    function go(target, animate = true) {
      const total = maxIndex + 1;
      index = ((target % total) + total) % total;
      if (!animate) track.style.transition = 'none';
      track.style.transform = `translate3d(${-index * stepSize()}px, 0, 0)`;
      if (!animate) {
        void track.offsetWidth;
        track.style.transition = '';
      }
      Array.from(dotsWrap.children).forEach((dot, i) => {
        dot.classList.toggle('is-active', i === index);
        if (i === index) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      slides.forEach((slide, i) => {
        const visible = i >= index && i < index + perView;
        slide.setAttribute('aria-hidden', String(!visible));
        slide.inert = !visible;
      });
    }

    function measure() {
      const value = parseInt(getComputedStyle(slider).getPropertyValue('--per-view'), 10);
      perView = Number.isFinite(value) && value > 0 ? value : 1;
      maxIndex = Math.max(0, slides.length - perView);
      buildDots();
      go(Math.min(index, maxIndex), false);
      const hideArrows = maxIndex === 0;
      prevBtn.hidden = hideArrows;
      nextBtn.hidden = hideArrows;
    }

    function stop() { clearInterval(timer); timer = null; }
    function start() {
      stop();
      if (reduceMotion.matches || maxIndex === 0) return;
      timer = setInterval(() => {
        if (!hovered && !focused && inView && !doc.hidden) go(index + 1);
      }, AUTOPLAY_MS);
    }
    const restart = start;

    prevBtn.addEventListener('click', () => { go(index - 1); restart(); });
    nextBtn.addEventListener('click', () => { go(index + 1); restart(); });
    slider.addEventListener('mouseenter', () => { hovered = true; });
    slider.addEventListener('mouseleave', () => { hovered = false; });
    slider.addEventListener('focusin', () => { focused = true; });
    slider.addEventListener('focusout', () => { focused = false; });
    slider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); restart(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); restart(); }
    });

    // Свайп на сенсорных экранах
    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let base = 0;
    let dragging = false;
    let horizontal = null;
    viewport.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      dragging = true;
      horizontal = null;
      startX = e.clientX;
      startY = e.clientY;
      deltaX = 0;
      base = -index * stepSize();
    });
    viewport.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (horizontal === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) horizontal = Math.abs(dx) > Math.abs(dy);
      if (!horizontal) return;
      deltaX = dx;
      track.style.transition = 'none';
      track.style.transform = `translate3d(${base + deltaX}px, 0, 0)`;
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      track.style.transition = '';
      if (!horizontal) return;
      const threshold = Math.min(70, stepSize() * 0.18);
      if (deltaX < -threshold) go(index + 1);
      else if (deltaX > threshold) go(index - 1);
      else go(index);
      restart();
    };
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    viewport.addEventListener('lostpointercapture', endDrag);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }, { threshold: 0.3 }).observe(slider);
    } else {
      inView = true;
    }

    let resizeTimer;
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(measure, 120); };
    if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(viewport);
    else window.addEventListener('resize', onResize);

    measure();
    start();
  });

  /* ---------- Модальные окна ---------- */
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const modals = new Map($$('.modal').map((m) => [m.id, m]));
  let activeModal = null;
  let lastFocus = null;

  function openModal(id, trigger) {
    const modal = modals.get(id);
    if (!modal) return;
    if (activeModal) closeModal(false);
    lastFocus = trigger || doc.activeElement;
    modal.removeAttribute('inert');
    modal.setAttribute('aria-hidden', 'false');
    activeModal = modal;
    lockScroll();
    modal.dispatchEvent(new CustomEvent('modal:open', { detail: { trigger } }));
    requestAnimationFrame(() => modal.classList.add('is-open'));
    const dialog = $('.modal__dialog', modal);
    dialog.setAttribute('tabindex', '-1');
    setTimeout(() => dialog.focus({ preventScroll: true }), 60);
  }

  function closeModal(restoreFocus = true) {
    const modal = activeModal;
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    activeModal = null;
    unlockScroll();
    modal.dispatchEvent(new CustomEvent('modal:close'));
    if (restoreFocus && lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({ preventScroll: true });
  }

  doc.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open]');
    if (opener) {
      e.preventDefault();
      openModal(opener.dataset.open, opener);
      return;
    }
    const closer = e.target.closest('[data-close]');
    if (closer && activeModal && activeModal.contains(closer)) {
      e.preventDefault();
      closeModal();
    }
  });

  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (activeModal) closeModal();
      else if (menuOpen) { setMenu(false); burger.focus(); }
      return;
    }
    if (e.key !== 'Tab') return;
    const container = activeModal ? $('.modal__dialog', activeModal) : (menuOpen ? header : null);
    if (!container) return;
    const items = $$(FOCUSABLE, container).filter((el) => el.offsetParent !== null || el === doc.activeElement);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (doc.activeElement === first || !container.contains(doc.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (doc.activeElement === last || !container.contains(doc.activeElement))) {
      e.preventDefault();
      first.focus();
    }
  });

  /* ---------- Форма онлайн-записи ---------- */
  const bookingModal = modals.get('booking');
  const form = $('#booking-form');
  if (bookingModal && form) {
    const formWrap = $('[data-booking-form-wrap]', bookingModal);
    const success = $('[data-booking-success]', bookingModal);
    const summary = $('[data-booking-summary]', bookingModal);
    const fields = form.elements;
    const submitBtn = $('button[type="submit"]', form);
    const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

    // Даты: с сегодняшнего дня и на 3 месяца вперёд
    const today = new Date();
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    fields.date.min = toISO(today);
    fields.date.max = toISO(maxDate);

    // Время: каждые 30 минут с 09:00 до 20:00, прошедшие слоты сегодня недоступны
    function fillTimes() {
      const select = fields.time;
      const current = select.value;
      const isToday = fields.date.value === toISO(new Date());
      const now = new Date();
      const earliest = now.getHours() * 60 + now.getMinutes() + 60;
      select.length = 1;
      for (let m = 9 * 60; m <= 20 * 60; m += 30) {
        const label = `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
        const option = new Option(label, label);
        if (isToday && m < earliest) option.disabled = true;
        select.add(option);
      }
      const stillValid = Array.from(select.options).some((o) => o.value === current && !o.disabled);
      select.value = stillValid ? current : '';
    }
    fillTimes();
    fields.date.addEventListener('change', fillTimes);

    // Маска телефона +7 (XXX) XXX-XX-XX
    const phone = fields.phone;
    const nationalDigits = (value) => {
      // убираем префикс маски «+7 (» и национальные 7/8 у полного номера
      let digits = value.replace(/\+7\s?\(?/, '').replace(/\D/g, '');
      if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) digits = digits.slice(1);
      return digits.slice(0, 10);
    };
    const formatPhone = (d) => {
      let out = '+7 (';
      out += d.slice(0, 3);
      if (d.length >= 3) out += ') ';
      out += d.slice(3, 6);
      if (d.length >= 6) out += '-';
      out += d.slice(6, 8);
      if (d.length >= 8) out += '-';
      out += d.slice(8, 10);
      return out;
    };
    let prevDigits = '';
    phone.addEventListener('input', (e) => {
      let digits = nationalDigits(phone.value);
      if (e.inputType && e.inputType.startsWith('delete') && digits === prevDigits) digits = digits.slice(0, -1);
      phone.value = digits ? formatPhone(digits).replace(/[)\s-]+$/, '') : '';
      prevDigits = digits;
    });
    phone.addEventListener('focus', () => {
      if (phone.value) return;
      phone.value = '+7 (';
      requestAnimationFrame(() => phone.setSelectionRange(phone.value.length, phone.value.length));
    });
    phone.addEventListener('blur', () => { if (!nationalDigits(phone.value)) phone.value = ''; });

    const rules = {
      name: (v) => (v.trim().length >= 2 ? '' : 'Введите имя — не меньше двух букв'),
      phone: (v) => (nationalDigits(v).length === 10 ? '' : 'Введите номер полностью: +7 (XXX) XXX-XX-XX'),
      service: (v) => (v ? '' : 'Выберите услугу'),
      date: (v) => {
        if (!v) return 'Выберите дату визита';
        if (v < fields.date.min) return 'Дата не может быть в прошлом';
        if (v > fields.date.max) return 'Запись доступна на 3 месяца вперёд';
        return '';
      },
      time: (v) => {
        if (!v) return 'Выберите удобное время';
        if (fields.time.selectedOptions[0]?.disabled) return 'Это время уже прошло — выберите другое';
        return '';
      },
    };

    function setError(name, message) {
      const control = fields[name];
      const field = control.closest('.field');
      const output = $('.field__error', field);
      field.classList.toggle('is-invalid', Boolean(message));
      control.setAttribute('aria-invalid', message ? 'true' : 'false');
      output.textContent = message;
    }
    function validateField(name) {
      const message = rules[name](fields[name].value);
      setError(name, message);
      return !message;
    }
    Object.keys(rules).forEach((name) => {
      const control = fields[name];
      const evt = control.tagName === 'SELECT' || control.type === 'date' ? 'change' : 'blur';
      control.addEventListener(evt, () => validateField(name));
      control.addEventListener('input', () => {
        if (control.closest('.field').classList.contains('is-invalid')) validateField(name);
      });
    });
    const agreeError = $('.field__error--agree', form);
    fields.agree.addEventListener('change', () => { if (fields.agree.checked) agreeError.textContent = ''; });

    // Предзаполнение по кнопке, с которой открыли окно
    bookingModal.addEventListener('modal:open', (e) => {
      const trigger = e.detail && e.detail.trigger;
      formWrap.hidden = false;
      success.hidden = true;
      if (!trigger) return;
      if (trigger.dataset.service) fields.service.value = trigger.dataset.service;
      if (trigger.dataset.master !== undefined) fields.master.value = trigger.dataset.master;
    });

    const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
    const weekdays = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу'];

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const results = Object.keys(rules).map((name) => validateField(name));
      if (!fields.agree.checked) {
        agreeError.textContent = 'Нужно согласие на обработку данных';
        results.push(false);
      }
      if (results.includes(false)) {
        const firstInvalid = $('.is-invalid .field__control', form) || fields.agree;
        firstInvalid.focus({ preventScroll: true });
        (firstInvalid.closest('.field') || firstInvalid).scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        return;
      }

      const data = {
        name: fields.name.value.trim(),
        phone: fields.phone.value,
        service: fields.service.value,
        master: fields.master.value,
        date: fields.date.value,
        time: fields.time.value,
        comment: fields.comment ? fields.comment.value.trim() : '',
      };
      submitBtn.disabled = true;
      submitBtn.querySelector('span').textContent = 'Отправляем…';

      // TODO: подключите отправку заявки — CRM, Telegram-бот или e-mail.
      // Пример: await fetch('/api/booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      await new Promise((resolve) => setTimeout(resolve, 700));

      const [y, m, d] = data.date.split('-').map(Number);
      const visit = new Date(y, m - 1, d);
      const when = `${weekdays[visit.getDay()]}, ${dateFormatter.format(visit)}, в ${data.time}`;
      const master = data.master ? `, мастер — ${data.master}` : '';
      summary.textContent = `${data.name}, ждём вас ${when} («${data.service}»${master}). Администратор позвонит на ${data.phone}, чтобы подтвердить запись.`;

      formWrap.hidden = true;
      success.hidden = false;
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent = 'Записаться';
      form.reset();
      fillTimes();
      prevDigits = '';
      $('.btn', success).focus({ preventScroll: true });
    });
  }

  /* ---------- Карта: масштаб ---------- */
  $$('[data-map]').forEach((map) => {
    const canvas = $('[data-map-canvas]', map);
    const levels = [1, 1.35, 1.8, 2.4];
    let level = 0;
    const apply = () => {
      canvas.style.transform = level ? `scale(${levels[level]})` : '';
      $$('[data-zoom="in"]', map).forEach((b) => { b.disabled = level === levels.length - 1; });
      $$('[data-zoom="out"]', map).forEach((b) => { b.disabled = level === 0; });
    };
    map.addEventListener('click', (e) => {
      const zoom = e.target.closest('[data-zoom]');
      if (zoom) {
        level = Math.max(0, Math.min(levels.length - 1, level + (zoom.dataset.zoom === 'in' ? 1 : -1)));
        apply();
      }
      if (e.target.closest('[data-map-reset]')) { level = 0; apply(); }
    });
    map.addEventListener('dblclick', (e) => {
      if (e.target.closest('button')) return;
      level = level === levels.length - 1 ? 0 : level + 1;
      apply();
    });
    apply();
  });

  /* ---------- Галерея ---------- */
  const galleryModal = modals.get('gallery');
  if (galleryModal) {
    const image = $('[data-gallery-image]', galleryModal);
    const caption = $('[data-gallery-caption]', galleryModal);
    const counter = $('[data-gallery-count]', galleryModal);
    const thumbs = $$('.gallery__thumb', galleryModal);
    let current = 0;
    let switchTimer;

    function show(i) {
      current = (i + thumbs.length) % thumbs.length;
      const thumb = thumbs[current];
      thumbs.forEach((t, k) => {
        t.classList.toggle('is-active', k === current);
        t.setAttribute('aria-pressed', String(k === current));
      });
      clearTimeout(switchTimer);
      image.classList.add('is-switching');
      switchTimer = setTimeout(() => {
        const done = () => image.classList.remove('is-switching');
        image.onload = done;
        image.src = thumb.dataset.src;
        image.alt = thumb.dataset.caption;
        if (image.complete) done();
      }, reduceMotion.matches ? 0 : 220);
      caption.textContent = thumb.dataset.caption;
      counter.textContent = `${current + 1} / ${thumbs.length}`;
      thumb.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => show(i)));
    $('[data-gallery-prev]', galleryModal).addEventListener('click', () => show(current - 1));
    $('[data-gallery-next]', galleryModal).addEventListener('click', () => show(current + 1));
    galleryModal.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });

    let touchX = null;
    const stage = $('.gallery__stage', galleryModal);
    stage.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
      touchX = null;
    });

    thumbs.forEach((t, k) => t.setAttribute('aria-pressed', String(k === 0)));
  }

  /* ---------- Год в подвале и прочее ---------- */
  root.classList.add('is-ready');
})();
