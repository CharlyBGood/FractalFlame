// app.js

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('fractal-canvas');
  const controls = {
    gamma: document.getElementById('gamma'),
    brightness: document.getElementById('brightness'),
    quality: document.getElementById('quality'),
    gammaValue: document.getElementById('gamma-value'),
    brightnessValue: document.getElementById('brightness-value'),
    qualityValue: document.getElementById('quality-value'),
    addXformBtn: document.getElementById('add-xform'),
    renderBtn: document.getElementById('render-btn'),
    xformsContainer: document.getElementById('xforms-container'),
    loadingIndicator: document.getElementById('loading-indicator'),
  };

  let xformCounter = 0;

  // --- Funciones de la Interfaz ---

  function updateSliderValue(slider, label) {
    if (slider.id === 'quality') {
      label.textContent = `${(slider.value / 1000000).toFixed(1)}M`;
    } else {
      label.textContent = slider.value;
    }
  }

  function addXform() {
    xformCounter++;
    const xformId = `xform-${xformCounter}`;
    const xformHTML = `
            <div class="xform" id="${xformId}">
                <h4>Transformación ${xformCounter}</h4>
                <div class="control-group">
                    <label>Peso:</label>
                    <input type="range" class="xform-weight" min="0.1" max="2" step="0.1" value="1">
                </div>
                <div class="control-group">
                    <label>Color:</label>
                    <input type="color" class="xform-color" value="${getRandomColor()}">
                </div>
                <div class="control-group">
                    <label>Variación:</label>
                    <select class="xform-variation">
                        <option value="linear">Linear</option>
                        <option value="sinusoidal">Sinusoidal</option>
                        <option value="spherical">Spherical</option>
                        <option value="swirl">Swirl</option>
                    </select>
                </div>
                <!-- Coeficientes a, b, c, d, e, f -->
                <input type="hidden" class="xform-coefs" value="${getRandomCoefs()}">
                <button class="remove-xform" data-target="${xformId}">Eliminar</button>
            </div>
        `;
    controls.xformsContainer.insertAdjacentHTML('beforeend', xformHTML);
  }

  function getRandomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }


  function getRandomCoefs() {
    return Array.from({ length: 6 }, () => (Math.random() * 2 - 1).toFixed(4)).join(',');
  }

  // --- Lógica Principal de Renderizado ---

  async function renderFractal() {
    controls.loadingIndicator.style.display = 'block';

    // 1. Recolectar todos los parámetros de la interfaz
    const params = {
      gamma: parseFloat(controls.gamma.value),
      brightness: parseFloat(controls.brightness.value),
      quality: parseInt(controls.quality.value),
      xforms: []
    };

    const xformElements = document.querySelectorAll('.xform');
    xformElements.forEach(el => {
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

    // 2. Crear el renderer y ejecutar
    if (params.xforms.length > 0) {
      const renderer = new FlameRenderer(canvas, params);
      await renderer.render();
    } else {
      alert("Añade al menos una transformación para generar una imagen.");
    }

    controls.loadingIndicator.style.display = 'none';
  }

  // --- Event Listeners ---

  controls.gamma.addEventListener('input', () => updateSliderValue(controls.gamma, controls.gammaValue));
  controls.brightness.addEventListener('input', () => updateSliderValue(controls.brightness, controls.brightnessValue));
  controls.quality.addEventListener('input', () => updateSliderValue(controls.quality, controls.qualityValue));

  controls.addXformBtn.addEventListener('click', addXform);
  controls.renderBtn.addEventListener('click', renderFractal);

  controls.xformsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-xform')) {
      const targetId = e.target.dataset.target;
      document.getElementById(targetId).remove();
    }
  });

  // Crear 2 transformaciones iniciales para empezar
  addXform();
  addXform();
});