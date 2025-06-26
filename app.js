// app.js
document.addEventListener('DOMContentLoaded', () => {
  // --- Elementos del DOM ---
  const canvas = document.getElementById('fractal-canvas');
  const controls = {
    gamma: document.getElementById('gamma'),
    brightness: document.getElementById('brightness'),
    quality: document.getElementById('quality'),
    gammaValue: document.getElementById('gamma-value'),
    brightnessValue: document.getElementById('brightness-value'),
    qualityValue: document.getElementById('quality-value'),
    addXformBtn: document.getElementById('add-xform-btn'),
    xformsContainer: document.getElementById('xforms-container'),
    loadingIndicator: document.getElementById('loading-indicator'),
    globalControlsForm: document.getElementById('global-controls-form'),
  };

  let xformCounter = 0;
  const PREVIEW_QUALITY = 50000; // Calidad para el renderizado rápido

  // --- Helper: Debounce ---
  // Evita que una función se ejecute demasiadas veces, esperando a que el usuario pare.
  function debounce(func, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // --- Lógica de la Interfaz ---
  function updateSliderValue(slider, label) {
    if (slider.id === 'quality') {
      label.textContent = `${(slider.value / 1000000).toFixed(1)}M`;
    } else {
      label.textContent = slider.value;
    }
  }

  function addXform(isInitial = false) {
    xformCounter++;
    const xformId = `xform-${xformCounter}`;
    const xformHTML = `
            <div class="xform" id="${xformId}" data-id="${xformCounter}">
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
                    <input type="color" class="xform-color" value="${getRandomColor()}">
                </div>
                <div class="control-group">
                    <label>Variación</label>
                    <select class="xform-variation">
                        <option value="linear">Linear</option>
                        <option value="sinusoidal">Sinusoidal</option>
                        <option value="spherical" selected>Spherical</option>
                        <option value="swirl">Swirl</option>
                        <option value="horseshoe">Horseshoe</option>
                        <option value="polar">Polar</option>
                        <option value="heart">Heart</option>
                    </select>
                </div>
                <input type="hidden" class="xform-coefs" value="${getRandomCoefs()}">
            </div>
        `;
    controls.xformsContainer.insertAdjacentHTML('beforeend', xformHTML);
    if (!isInitial) triggerFullRender(); // Renderizar al añadir nueva forma
  }

  function getRandomColor() {
    const h = Math.random() * 360;
    const s = 70 + Math.random() * 30;
    const l = 50 + Math.random() * 20;
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  function getRandomCoefs() {
    return Array.from({ length: 6 }, () => (Math.random() * 2 - 1).toFixed(4)).join(',');
  }

  // --- Lógica Principal de Renderizado ---
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
        color: { // Convertir de hex #RRGGBB a {r, g, b} en [0, 1]
          r: parseInt(colorHex.slice(1, 3), 16) / 255,
          g: parseInt(colorHex.slice(3, 5), 16) / 255,
          b: parseInt(colorHex.slice(5, 7), 16) / 255,
        },
        variation: el.querySelector('.xform-variation').value,
        coefs: el.querySelector('.xform-coefs').value.split(',').map(Number)
      });
    });
    return params;
  }

  async function render(isPreview) {
    if (!isPreview) {
      controls.loadingIndicator.style.display = 'flex';
    }

    const params = getParamsFromUI(isPreview);

    if (params.xforms.length > 0) {
      const renderer = new FlameRenderer(canvas, params);
      // Ejecutamos en un timeout para permitir que la UI se actualice
      await new Promise(resolve => setTimeout(() => {
        renderer.render().then(resolve);
      }, 10));
    }

    if (!isPreview) {
      controls.loadingIndicator.style.display = 'none';
    }
  }

  // --- Vinculación de Eventos ---
  const triggerPreviewRender = () => render(true);
  const triggerFullRender = debounce(() => render(false), 400); // Espera 400ms después del último cambio

  function handleControlChange() {
    triggerPreviewRender();
    triggerFullRender();
  }

  // Listen for changes on the whole panel for efficiency
  controls.controls - panel.addEventListener('input', (e) => {
    if (e.target.matches('input[type=range], input[type=color], select')) {
      if (e.target.closest('.xform') || e.target.closest('#global-controls-form')) {
        // Actualizar valor numérico del slider
        const valueDisplay = e.target.parentElement.querySelector('.value-display');
        if (valueDisplay) updateSliderValue(e.target, valueDisplay);

        handleControlChange();
      }
    }
  });

  controls.addXformBtn.addEventListener('click', () => addXform(false));

  controls.xformsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-xform-btn')) {
      document.getElementById(e.target.dataset.target).remove();
      triggerFullRender(); // Renderizar al quitar una forma
    }
  });

  // --- Inicialización ---
  addXform(true);
  addXform(true);
  updateSliderValue(controls.gamma, controls.gammaValue);
  updateSliderValue(controls.brightness, controls.brightnessValue);
  updateSliderValue(controls.quality, controls.qualityValue);

  // Renderizado inicial al cargar la página
  triggerFullRender();
});