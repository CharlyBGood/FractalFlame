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
    loadingIndicator: document.getElementById('loading-indicator'),
    loadingText: document.querySelector('#loading-indicator span'),
    downloadBtn: document.getElementById('download-btn'),
    randomizeBtn: document.getElementById('randomize-btn'),
    canvasContainer: document.querySelector('.canvas-container'),
  };

  let xformCounter = 0;
  const isMobile = window.innerWidth <= 768;
  const PREVIEW_QUALITY = isMobile ? 80000 : 200000;

  // Expansive variations keep the attractor large enough to fill the canvas
  const EXPANDER_VARIATIONS = ['spherical', 'swirl', 'julia', 'hyperbolic', 'spiral', 'disc', 'horseshoe', 'polar', 'ex'];
  const GOOD_VARIATIONS = [
    ...EXPANDER_VARIATIONS,
    'diamond', 'eyefish', 'bubble', 'heart', 'sinusoidal', 'waves', 'fisheye', 'popcorn', 'pdj'
  ];

  function debounce(func, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  function updateSliderValue(slider, label) {
    if (!label) return;
    if (slider.id === 'quality') {
      label.textContent = `${(slider.value / 1000000).toFixed(1)}M`;
    } else if (slider.id === 'symmetry') {
      label.textContent = slider.value;
    } else {
      label.textContent = parseFloat(slider.value).toFixed(1);
    }
  }

  function applyBackgroundMode() {
    const isTransparent = controls.backgroundMode.value === 'transparent';
    controls.canvasContainer.classList.toggle('transparent-bg', isTransparent);
  }

  function getRandomColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  }

  // Contractive affine coefs via rotation+scale — guarantees the attractor converges
  function getRandomCoefs() {
    const s = Math.random() * 0.5 + 0.35;
    const theta = Math.random() * 2 * Math.PI;
    const cos = Math.cos(theta), sin = Math.sin(theta);
    return [
      (s * cos).toFixed(4),
      (-s * sin).toFixed(4),
      (Math.random() * 0.8 - 0.4).toFixed(4),
      (s * sin).toFixed(4),
      (s * cos).toFixed(4),
      (Math.random() * 0.8 - 0.4).toFixed(4)
    ];
  }

  function buildVariationOptions(selected) {
    const groups = [
      { label: 'Clásicas',   items: ['linear', 'sinusoidal', 'spherical', 'swirl', 'horseshoe', 'polar', 'heart'] },
      { label: 'Complejas',  items: ['julia', 'disc', 'spiral', 'hyperbolic', 'diamond', 'ex'] },
      { label: 'Especiales', items: ['eyefish', 'bubble', 'cylinder', 'fisheye', 'bent', 'waves', 'popcorn', 'pdj'] },
    ];
    return groups.map(g =>
      `<optgroup label="${g.label}">` +
      g.items.map(v =>
        `<option value="${v}"${v === selected ? ' selected' : ''}>${v.charAt(0).toUpperCase() + v.slice(1)}</option>`
      ).join('') +
      `</optgroup>`
    ).join('');
  }

  function addXform(isInitial = false, coefs = null, variation = 'spherical', color = null) {
    xformCounter++;
    const xformId = `xform-${xformCounter}`;
    const coefsArray = coefs
      ? coefs.split(',').map(Number)
      : getRandomCoefs().map(Number);

    const coefLabels = ['a', 'b', 'c', 'd', 'e', 'f'];
    const coefsHTML = coefLabels.map((lbl, i) => `
      <div class="coef-row">
        <span class="coef-label">${lbl}</span>
        <input type="range" class="xform-coef" data-coef="${i}" min="-1.5" max="1.5" step="0.01" value="${parseFloat(coefsArray[i]).toFixed(4)}">
        <span class="coef-val">${parseFloat(coefsArray[i]).toFixed(2)}</span>
      </div>
    `).join('');

    const xformHTML = `
      <div class="xform" id="${xformId}">
        <div class="xform-header">
          <h4>Transform ${xformCounter}</h4>
          <button class="remove-xform-btn" data-target="${xformId}">×</button>
        </div>
        <div class="control-group">
          <label>Peso <span class="value-display">1.0</span></label>
          <input type="range" class="xform-weight" min="0.1" max="2" step="0.1" value="1.0">
        </div>
        <div class="control-group">
          <label>Color</label>
          <input type="color" class="xform-color" value="${color || getRandomColor()}">
        </div>
        <div class="control-group">
          <label>Variación</label>
          <select class="xform-variation">
            ${buildVariationOptions(variation)}
          </select>
        </div>
        <details class="coefs-section">
          <summary>Coeficientes</summary>
          <div class="coefs-grid">${coefsHTML}</div>
        </details>
      </div>
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
      const colorHex = el.querySelector('.xform-color').value;
      const coefs = Array.from(el.querySelectorAll('.xform-coef')).map(s => parseFloat(s.value));
      params.xforms.push({
        weight: parseFloat(el.querySelector('.xform-weight').value),
        color: {
          r: parseInt(colorHex.slice(1, 3), 16) / 255,
          g: parseInt(colorHex.slice(3, 5), 16) / 255,
          b: parseInt(colorHex.slice(5, 7), 16) / 255
        },
        variation: el.querySelector('.xform-variation').value,
        coefs
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
      if (t.classList.contains('xform-coef')) {
        const row = t.closest('.coef-row');
        if (row) row.querySelector('.coef-val').textContent = parseFloat(t.value).toFixed(2);
      } else {
        const group = t.closest('.control-group');
        if (group) updateSliderValue(t, group.querySelector('.value-display'));
      }
    }

    if (t.id === 'background-mode') applyBackgroundMode();

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
    controls.gamma.value = (Math.random() * 2.5 + 1.5).toFixed(1);
    controls.brightness.value = (Math.random() * 8 + 4).toFixed(1);
    controls.symmetry.value = [1, 1, 1, 2, 2, 3, 3, 4, 5, 6][Math.floor(Math.random() * 10)];

    document.querySelectorAll('.xform').forEach((xform, idx) => {
      xform.querySelector('.xform-weight').value = (Math.random() * 1.5 + 0.5).toFixed(1);
      const weightDisplay = xform.querySelector('.xform-weight')?.closest('.control-group')?.querySelector('.value-display');
      if (weightDisplay) weightDisplay.textContent = xform.querySelector('.xform-weight').value;

      xform.querySelector('.xform-color').value = getRandomColor();
      // First transform always uses an expander so the attractor fills the canvas
      const pool = idx === 0 ? EXPANDER_VARIATIONS : GOOD_VARIATIONS;
      xform.querySelector('.xform-variation').value = pool[Math.floor(Math.random() * pool.length)];

      const newCoefs = getRandomCoefs();
      xform.querySelectorAll('.xform-coef').forEach((coefInput, i) => {
        coefInput.value = newCoefs[i];
        coefInput.closest('.coef-row').querySelector('.coef-val').textContent = parseFloat(newCoefs[i]).toFixed(2);
      });
    });

    updateSliderValue(controls.gamma, controls.gammaValue);
    updateSliderValue(controls.brightness, controls.brightnessValue);
    updateSliderValue(controls.symmetry, controls.symmetryValue);
    triggerFullRender();
  }

  controls.panel.addEventListener('input', handleControlChange);
  controls.panel.addEventListener('change', handleControlChange);
  controls.addXformBtn.addEventListener('click', () => addXform(false));
  controls.downloadBtn.addEventListener('click', downloadImage);
  controls.randomizeBtn.addEventListener('click', randomizeAll);

  controls.xformsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-xform-btn')) {
      document.getElementById(e.target.dataset.target)?.remove();
      triggerFullRender();
    }
  });

  function initialize() {
    addXform(true, "0.824,-0.412,0.1,0.354,0.796,0.1", 'spherical', '#ff8d00');
    addXform(true, "-0.383,0.421,0.4,-0.642,-0.274,0.4", 'julia', '#00aaff');

    updateSliderValue(controls.gamma, controls.gammaValue);
    updateSliderValue(controls.brightness, controls.brightnessValue);
    updateSliderValue(controls.quality, controls.qualityValue);
    updateSliderValue(controls.symmetry, controls.symmetryValue);
    updateSliderValue(controls.scale, controls.scaleValue);

    applyBackgroundMode();
    render(false);
  }

  initialize();
});
