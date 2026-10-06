// Lucas Claras — único efecto de la página: el total de la boleta del hero cuenta hasta su valor.
// Sin JS o con "reducir movimiento" activado, el valor final ya está escrito en el HTML.
(function () {
  var el = document.querySelector('[data-count]');
  if (!el) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var target = Number(el.getAttribute('data-count'));
  var fmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var delay = 1300; // ms: espera a que aparezcan las filas anteriores
  var duration = 1100;
  var start = null;

  el.textContent = fmt.format(0);

  function frame(t) {
    if (start === null) start = t;
    var p = Math.min(Math.max((t - start - delay) / duration, 0), 1);
    var eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt.format(target * eased);
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
