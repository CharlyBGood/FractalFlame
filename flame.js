// flame.js

class FlameRenderer {
  constructor(canvas, params) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.params = params;

    // Inicializar el histograma. Guardará [r, g, b, alpha_hits]
    this.histogram = new Array(this.width * this.height).fill(0).map(() => [0, 0, 0, 0]);
    this.maxAlpha = 0;
  }

  // --- Definición de las variaciones no lineales (Vj) ---
  // (Implementamos algunas de las más importantes del PDF)
  variations = {
    linear: (x, y) => ({ x, y }),
    sinusoidal: (x, y) => ({ x: Math.sin(x), y: Math.sin(y) }),
    spherical: (x, y) => {
      const r2 = x * x + y * y;
      if (r2 === 0) return { x: 0, y: 0 };
      return { x: x / r2, y: y / r2 };
    },
    swirl: (x, y) => {
      const r2 = x * x + y * y;
      const cos_r2 = Math.cos(r2);
      const sin_r2 = Math.sin(r2);
      return { x: x * sin_r2 - y * cos_r2, y: x * cos_r2 + y * sin_r2 };
    },
    horseshoe: (x, y) => {
      const r = Math.sqrt(x * x + y * y);
      if (r === 0) return { x: 0, y: 0 };
      return { x: (x - y) * (x + y) / r, y: 2 * x * y / r };
    },
    polar: (x, y) => {
      const r = Math.sqrt(x * x + y * y);
      const theta = Math.atan2(y, x);
      return { x: theta / Math.PI, y: r - 1 };
    },
    heart: (x, y) => {
      const r = Math.sqrt(x * x + y * y);
      const theta = Math.atan2(y, x) * r;
      return { x: r * Math.sin(theta), y: -r * Math.cos(theta) };
    }
  };

  // --- El Algoritmo Principal: "Chaos Game" ---
  runChaosGame() {
    let p = { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 };
    let c = { r: Math.random(), g: Math.random(), b: Math.random() };

    const totalWeight = this.params.xforms.reduce((sum, xf) => sum + xf.weight, 0);

    // Pre-calculamos pesos acumulados para seleccionar una xform
    const cumulativeWeights = [];
    let currentWeight = 0;
    for (const xform of this.params.xforms) {
      currentWeight += xform.weight / totalWeight;
      cumulativeWeights.push(currentWeight);
    }

    for (let i = 0; i < this.params.quality; i++) {
      // 1. Elegir una transformación (xform) al azar según su peso
      const rand = Math.random();
      let xformIndex = cumulativeWeights.findIndex(w => rand < w);
      const xform = this.params.xforms[xformIndex];

      // 2. Aplicar la transformación afín (Fi)
      const af = xform.coefs; // [a, b, c, d, e, f]
      const x_aff = af[0] * p.x + af[1] * p.y + af[2];
      const y_aff = af[3] * p.x + af[4] * p.y + af[5];

      // 3. Aplicar la variación no lineal (Vj)
      const variationFunc = this.variations[xform.variation] || this.variations.linear;
      p = variationFunc(x_aff, y_aff);

      // 4. Actualizar el color
      const xformColor = xform.color;
      c.r = (c.r + xformColor.r) / 2;
      c.g = (c.g + xformColor.g) / 2;
      c.b = (c.b + xformColor.b) / 2;

      // 5. Plotear el punto en el histograma (después de 20 iteraciones de calentamiento)
      if (i > 20) {
        // Mapear el punto del espacio [-2, 2] al canvas
        const canvasX = Math.floor(this.width * (p.x / 4 + 0.5));
        const canvasY = Math.floor(this.height * (-p.y / 4 + 0.5)); // Invertir Y

        if (canvasX >= 0 && canvasX < this.width && canvasY >= 0 && canvasY < this.height) {
          const index = canvasY * this.width + canvasX;
          const pixel = this.histogram[index];
          pixel[0] += c.r;
          pixel[1] += c.g;
          pixel[2] += c.b;
          pixel[3]++; // Incrementar el contador de "hits" (alpha)
          if (pixel[3] > this.maxAlpha) {
            this.maxAlpha = pixel[3];
          }
        }
      }
    }
  }

  // --- Renderizado Final en el Canvas ---
  renderToCanvas() {
    const imageData = this.ctx.createImageData(this.width, this.height);
    const data = imageData.data;
    const logMaxAlpha = Math.log10(this.maxAlpha);

    for (let i = 0; i < this.histogram.length; i++) {
      const pixel = this.histogram[i];
      const alpha = pixel[3];

      if (alpha > 0) {
        // 1. Mapeo de densidad logarítmica
        const brightnessFactor = Math.log10(alpha) / logMaxAlpha * this.params.brightness;

        // 2. Calcular color final
        let r = pixel[0] / alpha;
        let g = pixel[1] / alpha;
        let b = pixel[2] / alpha;

        // 3. Aplicar brillo y gamma
        r = Math.pow(r * brightnessFactor, 1 / this.params.gamma);
        g = Math.pow(g * brightnessFactor, 1 / this.params.gamma);
        b = Math.pow(b * brightnessFactor, 1 / this.params.gamma);

        // 4. Escribir en los datos de la imagen
        const dataIndex = i * 4;
        data[dataIndex] = r * 255;
        data[dataIndex + 1] = g * 255;
        data[dataIndex + 2] = b * 255;
        data[dataIndex + 3] = 255; // Opacidad total
      }
    }
    this.ctx.putImageData(imageData, 0, 0);
  }

  // --- Función principal que orquesta todo ---
  async render() {
    // Limpiar para el nuevo renderizado
    this.histogram.forEach(p => { p[0] = 0; p[1] = 0; p[2] = 0; p[3] = 0; });
    this.maxAlpha = 0;
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Usamos un timeout para que el UI se actualice y muestre "Renderizando..."
    await new Promise(resolve => setTimeout(resolve, 10));

    this.runChaosGame();
    this.renderToCanvas();
  }
}