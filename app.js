// app.js
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('fractal-canvas');
  const controls = {
    panel: document.querySelector('.controls-panel'),
    gamma: document.getElementById('gamma'),
    brightness: document.getElementById('brightness'),
    quality: document.getElementById('quality'),
    symmetry: document.getElementById('symmetry'),
    scale: document.getElementById('scale'),
    backgroundMode: document.getElementById('background-mode'),
    gammaValue: document.getElementById('gamma-value'),
    brightnessValue: document.getElementById('brightness-value'),
    qualityValue: document.getElementById('quality-value'),
    symmetryValue: document.getElementById('symmetry-value'),
    scaleValue: document.getElementById('scale-value'),
    addXformBtn: document.getElementById('add-xform-btn'),
    xformsContainer: document.getElementById('xforms-container'),
    paletteGrid: document.getElementById('palette-grid'),
    loadingIndicator: document.getElementById('loading-indicator'),
    loadingText: document.querySelector('#loading-indicator span'),
    downloadBtn: document.getElementById('download-btn'),
    randomizeBtn: document.getElementById('randomize-btn'),
    canvasContainer: document.querySelector('.canvas-container'),
  };

  let xformCounter = 0;
  const isMobile = window.innerWidth <= 768;
  const PREVIEW_QUALITY = isMobile ? 80000 : 200000;

  const PALETTES = [
    { name: 'Fuego',   colors: ['#ff5500', '#ff9900', '#ffee00', '#ff2200'] },
    { name: 'Océano',  colors: ['#00b4d8', '#0077b6', '#90e0ef', '#023e8a'] },
    { name: 'Magenta', colors: ['#ff00cc', '#aa00ff', '#ff0066', '#ff9900'] },
    { name: 'Neón',    colors: ['#00ffcc', '#00ccff', '#ffff00', '#ff00aa'] },
    { name: 'Cosmos',  colors: ['#9b00ff', '#cc77ff', '#ff77dd', '#5500aa'] },
    { name: 'Aurora',  colors: ['#00ff88', '#00ccff', '#ff00ff', '#ffaa00'] },
  ];

  const EXPANDER_VARIATIONS = ['spherical', 'swirl', 'julia', 'disc', 'horseshoe', 'ex'];
  const ALL_VARIATIONS = [...EXPANDER_VARIATIONS, 'diamond', 'sinusoidal'];

  function debounce(func, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  function applyBackgroundMode() {
    controls.canvasContainer.classList.toggle('transparent-bg', controls.backgroundMode.value === 'transparent');
  }

  function getRandomColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  }

  function buildPaletteGrid() {
    PALETTES.forEach((palette, idx) => {
      const btn = document.createElement('button');
      btn.className = 'palette-btn';
      btn.dataset.paletteIdx = idx;
      btn.innerHTML = `
        <span class="palette-swatches">${palette.colors.map(c => `<span class="palette-swatch" style="background:${c}"></span>`).join('')}</span>
        <span class="palette-name">${palette.name}</span>
      `;
      controls.paletteGrid.appendChild(btn);
    });
  }

  function setActivePalette(idx) {
    document.querySelectorAll('.palette-btn').forEach((btn, i) => btn.classList.toggle('active', i === idx));
  }

  function applyPalette(palette) {
    document.querySelectorAll('.xform').forEach((xform, i) => {
      const color = palette.colors[i % palette.colors.length];
      xform.querySelector('.xform-color').value = color;
      const dot = xform.querySelector('.xform-color-dot');
      if (dot) dot.style.background = color;
    });
  }

  function updateXformDisplays(xform) {
    const rot = xform.querySelector('.xform-rotation');
    const dispOf = el => el?.closest('.control-group')?.querySelector('.value-display');
    if (rot) { const d = dispOf(rot); if (d) d.textContent = `${Math.round(rot.value)}°`; }
    ['xform-scale-r', 'xform-tx', 'xform-ty'].forEach(cls => {
      const el = xform.querySelector('.' + cls);
      if (el) { const d = dispOf(el); if (d) d.textContent = parseFloat(el.value).toFixed(2); }
    });
    const wt = xform.querySelector('.xform-weight');
    if (wt) { const d = dispOf(wt); if (d) d.textContent = parseFloat(wt.value).toFixed(1); }
  }

  function addXform(isInitial = false, opts = {}) {
    xformCounter++;
    const xformId = `xform-${xformCounter}`;

    const rotation = opts.rotation ?? Math.floor(Math.random() * 360);
    const scale    = opts.scale    ?? +(Math.random() * 0.4 + 0.45).toFixed(2);
    const tx       = opts.tx       ?? +(Math.random() * 0.6 - 0.3).toFixed(2);
    const ty       = opts.ty       ?? +(Math.random() * 0.6 - 0.3).toFixed(2);
    const weight   = opts.weight   ?? 1.0;
    const variation = opts.variation ?? 'spherical';
    const color    = opts.color    ?? getRandomColor();

    const VARIATION_OPTIONS = [
      { value: 'spherical',  label: 'Spherical'  },
      { value: 'swirl',      label: 'Swirl'      },
      { value: 'julia',      label: 'Julia'      },
      { value: 'disc',       label: 'Disc'       },
      { value: 'horseshoe',  label: 'Horseshoe'  },
      { value: 'ex',         label: 'Ex'         },
      { value: 'diamond',    label: 'Diamond'    },
      { value: 'sinusoidal', label: 'Sinusoidal' },
    ];

    const xformHTML = `
      <details class="xform" id="${xformId}" open>
        <summary class="xform-header">
          <h4>Transform ${xformCounter}</h4>
          <span class="xform-color-dot" style="background:${color}"></span>
          <button class="remove-xform-btn" data-target="${xformId}" type="button">×</button>
        </summary>
        <div class="xform-body">
          <div class="control-group">
            <label>Variación</label>
            <select class="xform-variation">
              ${VARIATION_OPTIONS.map(v => `<option value="${v.value}"${v.value === variation ? ' selected' : ''}>${v.label}</option>`).join('')}
            </select>
          </div>
          <div class="control-group">
            <label>Rotación <span class="value-display">${Math.round(rotation)}°</span></label>
            <input type="range" class="xform-rotation" min="0" max="359" step="1" value="${rotation}">
          </div>
          <div class="control-group">
            <label>Escala <span class="value-display">${(+scale).toFixed(2)}</span></label>
            <input type="range" class="xform-scale-r" min="0.2" max="0.95" step="0.01" value="${scale}">
          </div>
          <div class="twin-group">
            <div class="control-group">
              <label>X <span class="value-display">${(+tx).toFixed(2)}</span></label>
              <input type="range" class="xform-tx" min="-0.7" max="0.7" step="0.01" value="${tx}">
            </div>
            <div class="control-group">
              <label>Y <span class="value-display">${(+ty).toFixed(2)}</span></label>
              <input type="range" class="xform-ty" min="-0.7" max="0.7" step="0.01" value="${ty}">
            </div>
          </div>
          <div class="control-group">
            <label>Peso <span class="value-display">${(+weight).toFixed(1)}</span></label>
            <input type="range" class="xform-weight" min="0.1" max="2" step="0.1" value="${weight}">
          </div>
          <div class="control-group">
            <label>Color</label>
            <input type="color" class="xform-color" value="${color}">
          </div>
        </div>
      </details>
    `;
    controls.xformsContainer.insertAdjacentHTML('beforeend', xformHTML);
    if (!isInitial) triggerFullRender();
  }

  function getParamsFromUI(isPreview = false) {
    const params = {
      gamma: parseFloat(controls.gamma.value),
      brightness: parseFloat(controls.brightness.value),
      quality: isPreview ? PREVIEW_QUALITY : parseInt(controls.quality.value),
      background: controls.backgroundMode.value,
      symmetry: parseInt(controls.symmetry.value),
      scale: parseFloat(controls.scale.value),
      xforms: []
    };

    document.querySelectorAll('.xform').forEach(el => {
      const rotation = parseFloat(el.querySelector('.xform-rotation').value) * Math.PI / 180;
      const s        = parseFloat(el.querySelector('.xform-scale-r').value);
      const tx       = parseFloat(el.querySelector('.xform-tx').value);
      const ty       = parseFloat(el.querySelector('.xform-ty').value);
      const colorHex = el.querySelector('.xform-color').value;

      params.xforms.push({
        weight: parseFloat(el.querySelector('.xform-weight').value),
        color: {
          r: parseInt(colorHex.slice(1, 3), 16) / 255,
          g: parseInt(colorHex.slice(3, 5), 16) / 255,
          b: parseInt(colorHex.slice(5, 7), 16) / 255
        },
        variation: el.querySelector('.xform-variation').value,
        coefs: [
          s * Math.cos(rotation), -s * Math.sin(rotation), tx,
          s * Math.sin(rotation),  s * Math.cos(rotation), ty
        ]
      });
    });

    return params;
  }

  let isRendering = false;
  let pendingFullRender = false;

  async function render(isPreview) {
    if (isRendering) {
      if (!isPreview) pendingFullRender = true;
      return;
    }
    isRendering = true;
    pendingFullRender = false;

    if (!isPreview) controls.loadingIndicator.style.display = 'flex';

    await new Promise(resolve => setTimeout(resolve, 10));
    const params = getParamsFromUI(isPreview);
    if (params.xforms.length > 0) {
      const renderer = new FlameRenderer(canvas, params);
      await renderer.render();
    } else {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }

    if (!isPreview) controls.loadingIndicator.style.display = 'none';
    isRendering = false;

    if (pendingFullRender) {
      pendingFullRender = false;
      render(false);
    }
  }

  const triggerPreviewRender = () => render(true);
  const triggerFullRender = debounce(() => render(false), isMobile ? 500 : 300);

  function handleControlChange(event) {
    const t = event.target;

    if (t.type === 'range') {
      const group = t.closest('.control-group');
      const display = group?.querySelector('.value-display');
      if (display) {
        if (t.classList.contains('xform-rotation')) {
          display.textContent = `${Math.round(parseFloat(t.value))}°`;
        } else if (t.id === 'quality') {
          display.textContent = `${(t.value / 1000000).toFixed(1)}M`;
        } else if (t.id === 'symmetry') {
          display.textContent = t.value;
        } else if (t.classList.contains('xform-weight')) {
          display.textContent = parseFloat(t.value).toFixed(1);
        } else {
          display.textContent = parseFloat(t.value).toFixed(2);
        }
      }
    }

    if (t.id === 'background-mode') applyBackgroundMode();

    if (t.classList.contains('xform-color')) {
      const dot = t.closest('.xform')?.querySelector('.xform-color-dot');
      if (dot) dot.style.background = t.value;
    }

    triggerPreviewRender();
    triggerFullRender();
  }

  async function downloadImage() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 2048;
    tempCanvas.height = 2048;

    const params = getParamsFromUI(false);
    params.quality = isMobile ? 4000000 : 8000000;

    controls.loadingText.textContent = 'Generando HD...';
    controls.loadingIndicator.style.display = 'flex';

    await new Promise(resolve => setTimeout(resolve, 50));

    const renderer = new FlameRenderer(tempCanvas, params);
    await renderer.render();

    if (params.background !== 'transparent') {
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = 2048;
      finalCanvas.height = 2048;
      const finalCtx = finalCanvas.getContext('2d');
      finalCtx.fillStyle = '#000000';
      finalCtx.fillRect(0, 0, 2048, 2048);
      finalCtx.drawImage(tempCanvas, 0, 0);
      triggerDownload(finalCanvas);
    } else {
      triggerDownload(tempCanvas);
    }

    controls.loadingIndicator.style.display = 'none';
    controls.loadingText.textContent = 'Renderizando...';
  }

  function triggerDownload(sourceCanvas) {
    const link = document.createElement('a');
    link.download = `fractal-flame-${Date.now()}.png`;
    link.href = sourceCanvas.toDataURL('image/png');
    link.click();
  }

  function randomizeAll() {
    const paletteIdx = Math.floor(Math.random() * PALETTES.length);
    const palette = PALETTES[paletteIdx];
    setActivePalette(paletteIdx);

    controls.gamma.value      = (Math.random() * 1.8 + 1.4).toFixed(1);
    controls.brightness.value = (Math.random() * 7 + 2).toFixed(1);
    controls.symmetry.value   = [1, 1, 1, 2, 2, 3, 3, 4, 6][Math.floor(Math.random() * 9)];

    const gammaDisplay = controls.gamma.closest('.control-group')?.querySelector('.value-display');
    if (gammaDisplay) gammaDisplay.textContent = parseFloat(controls.gamma.value).toFixed(1);
    const brightnessDisplay = controls.brightness.closest('.control-group')?.querySelector('.value-display');
    if (brightnessDisplay) brightnessDisplay.textContent = parseFloat(controls.brightness.value).toFixed(1);
    const symDisplay = controls.symmetry.closest('.control-group')?.querySelector('.value-display');
    if (symDisplay) symDisplay.textContent = controls.symmetry.value;

    // Randomize number of transforms (2–4) and rebuild from scratch
    const numXforms = 2 + Math.floor(Math.random() * 3);
    controls.xformsContainer.innerHTML = '';
    xformCounter = 0;

    for (let i = 0; i < numXforms; i++) {
      const pool = i === 0 ? EXPANDER_VARIATIONS : ALL_VARIATIONS;
      addXform(true, {
        rotation:  Math.floor(Math.random() * 360),
        scale:     +(Math.random() * 0.55 + 0.3).toFixed(2),
        tx:        +(Math.random() * 1.0 - 0.5).toFixed(2),
        ty:        +(Math.random() * 1.0 - 0.5).toFixed(2),
        weight:    +(Math.random() * 1.5 + 0.3).toFixed(1),
        color:     palette.colors[i % palette.colors.length],
        variation: pool[Math.floor(Math.random() * pool.length)],
      });
    }

    triggerFullRender();
  }

  controls.panel.addEventListener('input', handleControlChange);
  controls.panel.addEventListener('change', handleControlChange);
  controls.addXformBtn.addEventListener('click', () => addXform(false));
  controls.downloadBtn.addEventListener('click', downloadImage);
  controls.randomizeBtn.addEventListener('click', randomizeAll);

  controls.paletteGrid.addEventListener('click', e => {
    const btn = e.target.closest('.palette-btn');
    if (!btn) return;
    const idx = parseInt(btn.dataset.paletteIdx);
    setActivePalette(idx);
    applyPalette(PALETTES[idx]);
    triggerFullRender();
  });

  controls.xformsContainer.addEventListener('click', e => {
    if (e.target.classList.contains('remove-xform-btn')) {
      e.preventDefault();
      document.getElementById(e.target.dataset.target)?.remove();
      triggerFullRender();
    }
  });

  function initialize() {
    buildPaletteGrid();

    addXform(true, { rotation: 48,  scale: 0.65, tx:  0.10, ty:  0.10, variation: 'spherical', color: PALETTES[0].colors[0] });
    addXform(true, { rotation: 210, scale: 0.55, tx: -0.20, ty:  0.20, variation: 'julia',     color: PALETTES[0].colors[1] });

    setActivePalette(0);

    // Init global displays
    const initDisplay = (el, valueEl, formatter) => {
      if (el && valueEl) valueEl.textContent = formatter(el.value);
    };
    initDisplay(controls.gamma,      controls.gammaValue,      v => parseFloat(v).toFixed(1));
    initDisplay(controls.brightness, controls.brightnessValue, v => parseFloat(v).toFixed(1));
    initDisplay(controls.quality,    controls.qualityValue,    v => `${(v / 1000000).toFixed(1)}M`);
    initDisplay(controls.symmetry,   controls.symmetryValue,   v => v);
    initDisplay(controls.scale,      controls.scaleValue,      v => parseFloat(v).toFixed(1));

    applyBackgroundMode();
    render(false);
  }

  initialize();
});
