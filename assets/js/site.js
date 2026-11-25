/* Aurelia Casino — shared site behavior (mobile nav, active states) */
(function () {
  'use strict';

  var toggle = document.getElementById('menu-toggle');
  var nav = document.getElementById('main-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // Close nav after clicking a link on small screens
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A' && window.innerWidth <= 720) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
})();
