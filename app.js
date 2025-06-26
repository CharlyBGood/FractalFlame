// app.js
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('fractal-canvas');
  const controls = {
    panel: document.querySelector('.controls-panel'),
    gamma: document.getElementById('gamma'),
    brightness: document.getElementById('brightness'),
    quality: document.getElementById('quality'),
    gammaValue: document.getElementById('gamma-value'),
    brightnessValue: document.getElementById('brightness-value'),
    qualityValue: document.getElementById('quality-value'),
    addXformBtn: document.getElementById('add-xform-btn'),
    xformsContainer: document.getElementById('xforms-container'),
    loadingIndicator: document.getElementById('loading-indicator'),
    downloadBtn: document.getElementById('download-btn'),
    randomizeBtn: document.getElementById('randomize-btn'),
  };

  let xformCounter = 0;
  const isMobile = window.innerWidth <= 768;
  const PREVIEW_QUALITY = isMobile ? 80000 : 150000;

  function debounce(func, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  function updateSliderValue(slider, label) {
    // Añadimos una comprobación para evitar el error si el label no se encuentra
    if (!label) return;

    label.textContent = slider.id === 'quality'
      ? `${(slider.value / 1000000).toFixed(1)}M`
      : parseFloat(slider.value).toFixed(1);
  }

  function addXform(isInitial = false, coefs = null, variation = 'spherical', color = null) {
    xformCounter++;
    const xformId = `xform-${xformCounter}`;
    const xformHTML = `
            <div class="xform" id="${xformId}">
                <div class="xform-header">
                    <h4>Transformación ${xformCounter}</h4>
                    <button class="remove-xform-btn" data-target="${xformId}">×</button>
                </div>
                <div class="control-group">
                    <label>Peso</label>
                    <input type="range" class="xform-weight" min="0.1" max="2" step="0.1" value="1.0">
                </div>
                <div class="control-group">
                    <label>Color</label>
                    <input type="color" class="xform-color" value="${color || getRandomColor()}">
                </div>
                <div class="control-group">
                    <label>Variación</label>
                    <select class="xform-variation">
                        <option value="linear">Linear</option>
                        <option value="sinusoidal">Sinusoidal</option>
                        <option value="spherical">Spherical</option>
                        <option value="swirl">Swirl</option>
                        <option value="horseshoe">Horseshoe</option>
                        <option value="polar">Polar</option>
                        <option value="heart">Heart</option>
                        <option value="julia">Julia</option>
                    </select>
                </div>
                <input type="hidden" class="xform-coefs" value="${coefs || getRandomCoefs()}">
            </div>
        `;
    controls.xformsContainer.insertAdjacentHTML('beforeend', xformHTML);
    const newXform = document.getElementById(xformId);
    newXform.querySelector('.xform-variation').value = variation;
    if (!isInitial) triggerFullRender();
  }

  function getRandomColor() { return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`; }
  function getRandomCoefs() { return Array.from({ length: 6 }, () => (Math.random() * 1.8 - 0.9).toFixed(4)).join(','); }

  function getParamsFromUI(isPreview = false) {
    const params = {
      gamma: parseFloat(controls.gamma.value),
      brightness: parseFloat(controls.brightness.value),
      quality: isPreview ? PREVIEW_QUALITY : parseInt(controls.quality.value),
      xforms: []
    };
    document.querySelectorAll('.xform').forEach(el => {
      const colorHex = el.querySelector('.xform-color').value;
      params.xforms.push({
        weight: parseFloat(el.querySelector('.xform-weight').value),
        color: { r: parseInt(colorHex.slice(1, 3), 16) / 255, g: parseInt(colorHex.slice(3, 5), 16) / 255, b: parseInt(colorHex.slice(5, 7), 16) / 255 },
        variation: el.querySelector('.xform-variation').value,
        coefs: el.querySelector('.xform-coefs').value.split(',').map(Number)
      });
    });
    return params;
  }

  let isRendering = false;
  async function render(isPreview) {
    if (isRendering && !isPreview) return;
    if (isRendering && isPreview) return;
    isRendering = true;

    if (!isPreview) controls.loadingIndicator.style.display = 'flex';

    await new Promise(resolve => setTimeout(resolve, 10));
    const params = getParamsFromUI(isPreview);
    if (params.xforms.length > 0) {
      const renderer = new FlameRenderer(canvas, params);
      await renderer.render();
    } else {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (!isPreview) controls.loadingIndicator.style.display = 'none';
    isRendering = false;
  }

  const triggerPreviewRender = () => render(true);
  const triggerFullRender = debounce(() => render(false), isMobile ? 500 : 300);

  // ***** AQUÍ ESTÁ LA CORRECCIÓN *****
  function handleControlChange(event) {
    if (event.target.type === 'range') {
      // Buscamos el ancestro .control-group y luego el .value-display dentro de él.
      // Esto es mucho más seguro y robusto.
      const controlGroup = event.target.closest('.control-group');
      if (controlGroup) {
        const valueDisplay = controlGroup.querySelector('.value-display');
        updateSliderValue(event.target, valueDisplay);
      }
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

    controls.loadingIndicator.querySelector('span').textContent = 'Generando HD...';
    controls.loadingIndicator.style.display = 'flex';

    await new Promise(resolve => setTimeout(resolve, 50));
    const renderer = new FlameRenderer(tempCanvas, params);
    await renderer.render();

    const link = document.createElement('a');
    link.download = `fractal-flame-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();

    controls.loadingIndicator.style.display = 'none';
    controls.loadingIndicator.querySelector('span').textContent = 'Renderizando...';
  }

  function randomizeAll() {
    controls.gamma.value = (Math.random() * 2.5 + 1.5).toFixed(1);
    controls.brightness.value = (Math.random() * 8 + 4).toFixed(1);

    document.querySelectorAll('.xform').forEach(xform => {
      xform.querySelector('.xform-weight').value = (Math.random() * 1.5 + 0.5).toFixed(1);
      xform.querySelector('.xform-color').value = getRandomColor();
      xform.querySelector('.xform-coefs').value = getRandomCoefs();
      const variations = Array.from(xform.querySelector('.xform-variation').options);
      xform.querySelector('.xform-variation').value = variations[Math.floor(Math.random() * variations.length)].value;
    });

    updateSliderValue(controls.gamma, controls.gammaValue);
    updateSliderValue(controls.brightness, controls.brightnessValue);
    triggerFullRender();
  }

  controls.panel.addEventListener('input', handleControlChange);
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

    render(false);
  }

  initialize();
});