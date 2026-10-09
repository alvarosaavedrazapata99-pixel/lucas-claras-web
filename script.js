// Lucas Claras — efectos de la landing. Todo es opcional: sin JS o con "reducir movimiento" la página se ve completa.
(function () {
  var reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fmt2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var fmt0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

  // Cuenta un número desde 0 hasta su valor (boleta del hero y precio del Pro).
  function contar(el, hasta, ms, retraso) {
    if (reducir) return;
    var inicio = null;
    el.textContent = fmt2.format(0);
    function paso(t) {
      if (inicio === null) inicio = t;
      var p = Math.min(Math.max((t - inicio - retraso) / ms, 0), 1);
      el.textContent = fmt2.format(hasta * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  }

  // 1) Boleta del hero: el total cuenta hasta su valor y, cada pocos segundos, se "imprime" otro mes de ejemplo.
  var total = document.querySelector('[data-count]');
  if (total) contar(total, Number(total.getAttribute('data-count')), 1100, 1300);

  var ejemplos = [ // datos ficticios; cada uno cuadra: ventas − compras − gastos = te queda
    { mes: 'Septiembre', ventas: 62000, compras: 47330, gastos: 12060, fuga: 'Transporte, +18 % frente al mes anterior' },
    { mes: 'Octubre', ventas: 65300, compras: 48900, gastos: 12350, fuga: 'Arroz de tu proveedor principal, +5.2 %' },
    { mes: 'Noviembre', ventas: 58400, compras: 44120, gastos: 11480, fuga: 'Descuentos a clientes, +12 %' },
  ];
  var ticket = document.querySelector('.ticket');
  var campo = function (n) { return ticket && ticket.querySelector('[data-ticket="' + n + '"]'); };
  var iEjemplo = 0;
  if (ticket && total && !reducir) {
    setInterval(function () {
      if (document.hidden) return;
      iEjemplo = (iEjemplo + 1) % ejemplos.length;
      var e = ejemplos[iEjemplo];
      ticket.classList.remove('ticket--reimprime');
      void ticket.offsetWidth; // reinicia la animación
      ticket.classList.add('ticket--reimprime');
      document.querySelector('[data-ticket-mes]').textContent = e.mes;
      campo('ventas').textContent = fmt2.format(e.ventas);
      campo('compras').textContent = fmt2.format(e.compras);
      campo('gastos').textContent = fmt2.format(e.gastos);
      campo('fuga').textContent = e.fuga;
      contar(total, e.ventas - e.compras - e.gastos, 900, 700);
    }, 7000);
  }

  // 2) Calculadora: qué porcentaje de las ventas cuesta el plan Pro.
  var rango = document.getElementById('calc-ventas');
  var salida = document.querySelector('[data-calc-ventas]');
  var pct = document.querySelector('[data-calc-pct]');
  function calcular() {
    var ventas = Number(rango.value);
    salida.textContent = 'S/ ' + fmt0.format(ventas);
    var p = (12.9 / ventas) * 100;
    pct.textContent = (p < 0.01 ? p.toFixed(3) : p.toFixed(p < 0.1 ? 3 : 2)) + ' %';
    rango.style.setProperty('--avance', ((ventas - rango.min) / (rango.max - rango.min)) * 100 + '%');
    // La barra muestra lo poco que pesa el Pro frente a las ventas (con un mínimo visible).
    var barra = document.querySelector('.calc__barra');
    if (barra) barra.style.setProperty('--pro', Math.max(p, 0.6) + '%');
  }
  if (rango && salida && pct) { rango.addEventListener('input', calcular); calcular(); }

  // 3) Planes: las boletas se "imprimen" una tras otra al entrar en pantalla y el precio del Pro cuenta.
  var precios = document.querySelector('[data-precios]');
  if (precios && !reducir && 'IntersectionObserver' in window) {
    precios.classList.add('precios--esperando');
    var obs = new IntersectionObserver(function (entradas) {
      if (!entradas[0].isIntersecting) return;
      obs.disconnect();
      precios.classList.remove('precios--esperando');
      precios.classList.add('precios--imprimir');
      var num = precios.querySelector('[data-cuenta]');
      if (num) contar(num, Number(num.getAttribute('data-cuenta')), 900, 450);
    }, { threshold: 0.25 });
    obs.observe(precios);
  }

  // 4) Con mouse: la boleta se inclina un poco hacia el cursor y la sigue un brillo.
  if (!reducir && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.precio').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', ((x - 0.5) * 6).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - y) * 5).toFixed(2) + 'deg');
        card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }
})();
