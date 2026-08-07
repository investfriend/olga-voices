/* assets/learning.js v1 — иерархический навигатор обучения (Ступень → Курс) */
(function () {
  'use strict';

  var ARROW_SVG = '<svg class="lrn-row-arrow" width="18" height="18" viewBox="0 0 256 256" fill="currentColor">'
    + '<path d="M221.66 133.66l-72 72a8 8 0 0 1-11.32-11.32L196.69 136H40a8 8 0 0 1 0-16h156.69L138.34 61.66a8 8 0 0 1 11.32-11.32l72 72A8 8 0 0 1 221.66 133.66Z"/></svg>';

  var EXT_SVG = '<svg class="lrn-ext-ic" width="14" height="14" viewBox="0 0 256 256" fill="currentColor">'
    + '<path d="M228 104v116a12 12 0 0 1-12 12H40a12 12 0 0 1-12-12V40a12 12 0 0 1 12-12h116a12 12 0 0 1 0 24H52v152h152v-100a12 12 0 0 1 24 0Zm-40-88H148a12 12 0 0 0 0 24h22.06l-86.53 86.53a12 12 0 1 0 16.94 16.94L187 56.94V79a12 12 0 0 0 24 0V40a12 12 0 0 0-12-12Z"/></svg>';

  var _curStepId = null;

  function _cc() { return window.COURSE_CATALOG || null; }

  function _url(type, id) {
    var cc = _cc();
    if (!cc) return '#';
    return type === 'stream' ? cc.streamUrl(id) : cc.lessonUrl(id);
  }

  function _title(type, id) {
    var cc = _cc();
    return (cc && cc.title(type, id)) || '—';
  }

  function _openExt(url) {
    var tg = window.Telegram && window.Telegram.WebApp;
    if (tg && tg.openLink) { tg.openLink(url); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // ── Step screen ─────────────────────────────────────────────────────────────
  window.openStep = function (stepId) {
    var cc = _cc();
    var cat = cc && cc.stepCatalog;
    if (!cat) return;

    var step = null;
    for (var i = 0; i < cat.length; i++) { if (cat[i].id === stepId) { step = cat[i]; break; } }
    if (!step) return;

    _curStepId = stepId;

    var el = document.getElementById('step-content');
    if (!el) return;

    var html = '<div class="lrn-head">'
      + '<div class="lrn-badge">' + step.label + '</div>'
      + '<h2 class="lrn-title">' + step.sub + '</h2>'
      + '<p class="lrn-desc">' + step.desc + '</p>'
      + '</div>';

    html += '<div class="lrn-section-hdr">Курсы ступени</div>'
      + '<div class="lrn-list">';
    step.courses.forEach(function (c) {
      html += '<button class="lrn-row-btn lrn-course-btn" data-stream="' + c.streamId + '">'
        + '<span class="lrn-row-title">' + _title('stream', c.streamId) + '</span>'
        + ARROW_SVG
        + '</button>';
    });
    html += '</div>';

    if (step.materials && step.materials.length) {
      html += '<div class="lrn-section-hdr">Материалы ступени</div>'
        + '<div class="lrn-list">';
      step.materials.forEach(function (m) {
        html += '<button class="lrn-row-btn lrn-ext-btn" data-lesson="' + m.lessonId + '">'
          + '<span class="lrn-row-title">' + _title('lesson', m.lessonId) + '</span>'
          + EXT_SVG
          + '</button>';
      });
      html += '</div>';
    }

    html += '<button class="lrn-gc-link" data-stream="' + step.streamId + '">'
      + 'Открыть всю ступень в GetCourse'
      + '</button>';

    el.innerHTML = html;

    var backBtn = document.getElementById('step-back');
    if (backBtn) backBtn.onclick = function () { setPage('home'); };

    if (typeof setPage === 'function') setPage('step');
  };

  // ── Course screen ────────────────────────────────────────────────────────────
  window.openCourse = function (streamId) {
    var cc = _cc();
    var cat = cc && cc.stepCatalog;

    if (!cat) { _openExt(_url('stream', streamId)); return; }

    var course = null, parentStep = null;
    for (var i = 0; i < cat.length; i++) {
      var s = cat[i];
      for (var j = 0; j < s.courses.length; j++) {
        if (s.courses[j].streamId == streamId) { course = s.courses[j]; parentStep = s; break; }
      }
      if (course) break;
    }

    if (!course) { _openExt(_url('stream', streamId)); return; }

    var el = document.getElementById('course-content');
    if (!el) return;

    var courseTitle = _title('stream', streamId);
    var crumb = parentStep ? parentStep.label + ' · ' + parentStep.sub : '';

    var html = '<div class="lrn-head">'
      + (crumb ? '<div class="lrn-badge">' + crumb + '</div>' : '')
      + '<h2 class="lrn-title">' + courseTitle + '</h2>'
      + '</div>';

    var lessons = course.lessons;
    if (course.noLessons) {
      // Курс без внутреннего списка уроков — только кнопка
    } else if (lessons && lessons.length) {
      html += '<div class="lrn-section-hdr">Уроки</div>'
        + '<div class="lrn-list">';
      lessons.forEach(function (l, idx) {
        html += '<button class="lrn-row-btn lrn-lesson-btn" data-lesson="' + l.lessonId + '">'
          + '<span class="lrn-lesson-num">' + (idx + 1) + '</span>'
          + '<span class="lrn-row-title">' + (_title('lesson', l.lessonId) || l.title || '—') + '</span>'
          + '</button>';
      });
      html += '</div>';
    } else {
      html += '<div class="lrn-no-lessons">'
        + '<p>Список уроков появится в следующей версии приложения. Пока откройте курс через кнопку ниже.</p>'
        + '</div>';
    }

    html += '<button class="lrn-gc-link" data-stream="' + streamId + '">'
      + 'Открыть курс в GetCourse'
      + '</button>';

    el.innerHTML = html;

    var sid = _curStepId;
    var backBtn = document.getElementById('course-back');
    if (backBtn) backBtn.onclick = function () { if (sid) openStep(sid); else setPage('step'); };

    if (typeof setPage === 'function') setPage('course');
  };

  // ── Global click delegation ──────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var courseBtn = e.target.closest('.lrn-course-btn');
    if (courseBtn) {
      openCourse(parseInt(courseBtn.dataset.stream, 10));
      return;
    }

    var extBtn = e.target.closest('.lrn-ext-btn');
    if (extBtn) {
      _openExt(_url('lesson', parseInt(extBtn.dataset.lesson, 10)));
      return;
    }

    var lessonBtn = e.target.closest('.lrn-lesson-btn');
    if (lessonBtn) {
      _openExt(_url('lesson', parseInt(lessonBtn.dataset.lesson, 10)));
      return;
    }

    var gcLink = e.target.closest('.lrn-gc-link');
    if (gcLink) {
      if (gcLink.dataset.stream) _openExt(_url('stream', parseInt(gcLink.dataset.stream, 10)));
      else if (gcLink.dataset.lesson) _openExt(_url('lesson', parseInt(gcLink.dataset.lesson, 10)));
      return;
    }
  });

}());
