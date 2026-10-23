/* ==========================================================================
   L'Atelier des Ongles — art.js
   Dessine les ongles du site en SVG (formes + finitions), sans aucune image.
   Fil rouge visuel : l'ongle amande, ses reflets et sa lunule.
   Pour remplacer ces illustrations par de vraies photos : voir assets/js/config.js
   ========================================================================== */
(function () {
  'use strict';

  var uid = 0;

  /* Formes — viewBox 0 0 100 160 (l'ongle occupe x 20→80, y 3→136) */
  var SHAPES = {
    almond:   'M50 3 C58 3 68 24 73 56 C76 78 77 100 76 116 C75 130 66 137 50 137 C34 137 25 130 24 116 C23 100 24 78 27 56 C32 24 42 3 50 3 Z',
    stiletto: 'M50 0 C54 0 60 30 66 64 C71 88 74 104 74 116 C74 130 65 137 50 137 C35 137 26 130 26 116 C26 104 29 88 34 64 C40 30 46 0 50 0 Z',
    coffin:   'M38 4 L62 4 Q64 4 65 7 L74 56 C77 80 77 100 76 116 C75 130 66 137 50 137 C34 137 25 130 24 116 C23 100 23 80 26 56 L35 7 Q36 4 38 4 Z',
    square:   'M26 6 L74 6 Q78 6 78 10 L78 108 C78 128 70 137 50 137 C30 137 22 128 22 108 L22 10 Q22 6 26 6 Z',
    squoval:  'M34 5 L66 5 C74 5 78 12 78 24 L78 108 C78 128 70 137 50 137 C30 137 22 128 22 108 L22 24 C22 12 26 5 34 5 Z',
    round:    'M50 24 C68 24 78 46 78 80 C78 120 68 137 50 137 C32 137 22 120 22 80 C22 46 32 24 50 24 Z'
  };


  /* Petit générateur pseudo-aléatoire reproductible (les paillettes ne bougent pas d'un chargement à l'autre) */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function grad(id, stops, x1, y1, x2, y2) {
    var s = stops.map(function (st) {
      return '<stop offset="' + st[0] + '" stop-color="' + st[1] + '"' + (st[2] != null ? ' stop-opacity="' + st[2] + '"' : '') + '/>';
    }).join('');
    return '<linearGradient id="' + id + '" x1="' + (x1 || 0) + '" y1="' + (y1 || 0) + '" x2="' + (x2 == null ? 1 : x2) + '" y2="' + (y2 == null ? 1 : y2) + '">' + s + '</linearGradient>';
  }

  function flower(cx, cy, r, petal, heart, rot) {
    var out = '<g transform="translate(' + cx + ' ' + cy + ') rotate(' + (rot || 0) + ')">';
    for (var i = 0; i < 5; i++) {
      out += '<ellipse cx="0" cy="' + (-r * 0.62) + '" rx="' + (r * 0.4) + '" ry="' + (r * 0.62) + '" fill="' + petal + '" transform="rotate(' + (i * 72) + ')"/>';
    }
    return out + '<circle r="' + (r * 0.26) + '" fill="' + heart + '"/></g>';
  }

  function star(cx, cy, s, fill) {
    return '<path d="M' + cx + ' ' + (cy - s) + ' Q' + cx + ' ' + cy + ' ' + (cx + s) + ' ' + cy + ' Q' + cx + ' ' + cy + ' ' + cx + ' ' + (cy + s) + ' Q' + cx + ' ' + cy + ' ' + (cx - s) + ' ' + cy + ' Q' + cx + ' ' + cy + ' ' + cx + ' ' + (cy - s) + ' Z" fill="' + fill + '"/>';
  }

  /* Finitions : defs (dégradés) + body (peinture, dans le repère 100×150) */
  var DESIGNS = {
    cherry: {
      label: 'vernis rouge cerise',
      defs: function (id) { return grad(id + 'f', [[0, '#B01A47'], [0.55, '#6E0F2D'], [1, '#3C0618']], 0.1, 0, 0.9, 1); },
      body: function (id) { return '<rect width="100" height="150" fill="url(#' + id + 'f)"/>'; }
    },
    nude: {
      label: 'vernis nude',
      defs: function (id) { return grad(id + 'f', [[0, '#F8E6DD'], [1, '#E6B9AD']], 0.2, 0, 0.8, 1); },
      body: function (id) { return '<rect width="100" height="150" fill="url(#' + id + 'f)"/>'; }
    },
    french: {
      label: 'French',
      defs: function (id) { return grad(id + 'f', [[0, '#F7E3DA'], [1, '#E9C0B4']], 0.2, 0, 0.8, 1); },
      body: function (id) {
        return '<rect width="100" height="150" fill="url(#' + id + 'f)"/>' +
          '<path d="M0 0 H100 V40 Q50 62 0 40 Z" fill="#FFFCF8"/>';
      }
    },
    babyboomer: {
      label: 'baby-boomer',
      defs: function (id) { return grad(id + 'f', [[0, '#FFF9F4'], [0.5, '#F7DDD6'], [1, '#EBB9B3']], 0, 0, 0, 1); },
      body: function (id) { return '<rect width="100" height="150" fill="url(#' + id + 'f)"/>'; }
    },
    mirror: {
      label: 'effet miroir',
      defs: function (id) {
        return grad(id + 'f', [[0, '#FFFFFF'], [0.2, '#D6CFD4'], [0.38, '#8E8791'], [0.52, '#F5F0F3'], [0.72, '#B7AEB6'], [1, '#6C6570']], 0, 0, 1, 1);
      },
      body: function (id) {
        return '<rect width="100" height="150" fill="url(#' + id + 'f)"/>' +
          '<path d="M-10 110 L110 20" stroke="#fff" stroke-opacity=".5" stroke-width="7"/>' +
          '<path d="M-10 140 L110 50" stroke="#fff" stroke-opacity=".25" stroke-width="3"/>';
      }
    },
    glitter: {
      label: 'paillettes',
      defs: function (id) { return grad(id + 'f', [[0, '#4A1233'], [1, '#1E0A19']], 0.2, 0, 0.8, 1); },
      body: function (id) {
        var r = rng(id.length * 977 + 31), out = '<rect width="100" height="150" fill="url(#' + id + 'f)"/>', i, c;
        var colors = ['#F0D08E', '#F6C3D3', '#FFFFFF', '#E3B567'];
        for (i = 0; i < 64; i++) {
          c = colors[Math.floor(r() * colors.length)];
          out += '<circle cx="' + (18 + r() * 64).toFixed(1) + '" cy="' + (2 + r() * 136).toFixed(1) + '" r="' + (0.5 + r() * 1.5).toFixed(2) + '" fill="' + c + '" fill-opacity="' + (0.55 + r() * 0.45).toFixed(2) + '"/>';
        }
        out += star(44, 40, 5, '#FFF3D6') + star(60, 86, 4, '#FFE7EE') + star(38, 112, 3.4, '#FFF3D6');
        return out;
      }
    },
    floral: {
      label: 'fleurs',
      defs: function (id) { return grad(id + 'f', [[0, '#F8E8DF'], [1, '#EBC6BB']], 0.2, 0, 0.8, 1); },
      body: function (id) {
        return '<rect width="100" height="150" fill="url(#' + id + 'f)"/>' +
          '<path d="M44 52 C40 70 44 88 58 100" stroke="#9A6B54" stroke-width="1" fill="none" stroke-linecap="round"/>' +
          '<path d="M43 74 C34 70 32 62 35 58 C42 59 45 66 43 74Z" fill="#B28A68" fill-opacity=".8"/>' +
          flower(43, 48, 13, '#FFFDF9', '#C99A55', -10) +
          flower(62, 92, 10, '#7A1F3D', '#F2D49A', 14) +
          flower(37, 112, 7.5, '#FFFDF9', '#C99A55', 30);
      }
    },
    waves: {
      label: 'vagues',
      defs: function (id) { return grad(id + 'f', [[0, '#F7E2DA'], [1, '#E7B7AE']], 0.2, 0, 0.8, 1); },
      body: function (id) {
        var out = '<rect width="100" height="150" fill="url(#' + id + 'f)"/>', cols = ['#6E0F2D', '#C99A55', '#FFFCF8', '#6E0F2D', '#C99A55'], i;
        for (i = 0; i < 5; i++) {
          out += '<path d="M-10 ' + (34 + i * 22) + ' q15 -14 30 0 t30 0 t30 0 t30 0" stroke="' + cols[i] + '" stroke-width="4.2" fill="none" stroke-linecap="round"/>';
        }
        return out;
      }
    },
    freestyle: {
      label: 'freestyle',
      defs: function (id) {
        return grad(id + 'f', [[0, '#F4DCD2'], [1, '#EAC2B7']], 0.2, 0, 0.8, 1) +
          '<radialGradient id="' + id + 'a"><stop offset="0" stop-color="#7A1F3D"/><stop offset="1" stop-color="#7A1F3D" stop-opacity="0"/></radialGradient>' +
          '<radialGradient id="' + id + 'b"><stop offset="0" stop-color="#E4B96F"/><stop offset="1" stop-color="#E4B96F" stop-opacity="0"/></radialGradient>' +
          '<radialGradient id="' + id + 'c"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>';
      },
      body: function (id) {
        return '<rect width="100" height="150" fill="url(#' + id + 'f)"/>' +
          '<circle cx="32" cy="104" r="46" fill="url(#' + id + 'a)"/>' +
          '<circle cx="74" cy="40" r="34" fill="url(#' + id + 'b)"/>' +
          '<circle cx="62" cy="108" r="26" fill="url(#' + id + 'c)"/>' +
          '<path d="M8 136 C38 96 60 92 96 22" stroke="#E7C583" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
      }
    }
  };

  /**
   * nail({shape, design, decor, shadow, label}) → chaîne <svg>
   * decor = true : illustration purement décorative (cachée aux lecteurs d'écran)
   */
  function nail(o) {
    o = o || {};
    var shape = SHAPES[o.shape] ? o.shape : 'almond';
    var design = DESIGNS[o.design] ? o.design : 'cherry';
    var id = 'nl' + (++uid);
    var d = SHAPES[shape];
    var D = DESIGNS[design];
    var a11y = o.decor === false
      ? 'role="img" aria-label="' + (o.label || ('Ongle ' + D.label)) + '"'
      : 'aria-hidden="true"';
    return '<svg class="nailsvg" viewBox="0 0 100 160" ' + a11y + ' focusable="false">' +
      '<defs>' +
        '<clipPath id="' + id + 'c"><path d="' + d + '"/></clipPath>' +
        D.defs(id) +
        '<radialGradient id="' + id + 's"><stop offset="0" stop-color="#1F0F16" stop-opacity=".42"/><stop offset="1" stop-color="#1F0F16" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '</defs>' +
      (o.shadow === false ? '' : '<ellipse cx="50" cy="150" rx="32" ry="6" fill="url(#' + id + 's)"/>') +
      '<g clip-path="url(#' + id + 'c)">' +
        D.body(id) +
        '<path d="M26 138 Q26 108 50 108 Q74 108 74 138 Z" fill="#fff" fill-opacity=".14"/>' +
        '<ellipse cx="36" cy="70" rx="13" ry="52" fill="url(#' + id + 'g)"/>' +
        '<path d="M31 36 C28 62 28 92 32 118" stroke="#fff" stroke-opacity=".6" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="60" cy="22" rx="6" ry="2.2" fill="#fff" fill-opacity=".5" transform="rotate(24 60 22)"/>' +
      '</g>' +
      '<path d="' + d + '" fill="none" stroke="#1F0F16" stroke-opacity=".18" stroke-width=".9"/>' +
    '</svg>';
  }

  /* Trois ongles en éventail (tuile de galerie) */
  function cluster(design, shapes) {
    shapes = shapes || ['almond', 'coffin', 'squoval'];
    var rot = [-11, 0, 11], y = [8, -4, 8];
    return shapes.map(function (s, i) {
      return '<span class="cl__n" style="--r:' + rot[i] + 'deg;--y:' + y[i] + '%">' + nail({ shape: s, design: design }) + '</span>';
    }).join('');
  }

  /* Remplit tous les [data-nail="forme:finition"] */
  function hydrate(root) {
    (root || document).querySelectorAll('[data-nail]').forEach(function (el) {
      if (el.firstChild) return;
      var p = el.getAttribute('data-nail').split(':');
      el.innerHTML = nail({ shape: p[0], design: p[1], shadow: el.hasAttribute('data-noshadow') ? false : true });
    });
    (root || document).querySelectorAll('[data-cluster]').forEach(function (el) {
      if (el.firstChild) return;
      el.innerHTML = cluster(el.getAttribute('data-cluster'), (el.getAttribute('data-shapes') || '').split(',').filter(Boolean));
    });
  }

  window.Art = { SHAPES: SHAPES, DESIGNS: DESIGNS, nail: nail, cluster: cluster, hydrate: hydrate };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { hydrate(); });
  else hydrate();
})();
