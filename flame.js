// flame.js
class FlameRenderer {
    constructor(canvas, params) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.params = params;
        this.histogram = new Array(this.width * this.height).fill(null).map(() => [0, 0, 0, 0]);
        this.maxAlpha = 0;
    }

    variations = {
        linear: (x, y) => ({ x, y }),
        sinusoidal: (x, y) => ({ x: Math.sin(x), y: Math.sin(y) }),
        spherical: (x, y) => {
            const r2 = x * x + y * y;
            if (r2 < 1e-6) return { x: 0, y: 0 };
            return { x: x / r2, y: y / r2 };
        },
        swirl: (x, y) => {
            const r2 = x * x + y * y;
            return { x: x * Math.sin(r2) - y * Math.cos(r2), y: x * Math.cos(r2) + y * Math.sin(r2) };
        },
        horseshoe: (x, y) => {
            const r = Math.sqrt(x * x + y * y);
            if (r < 1e-6) return { x: 0, y: 0 };
            return { x: (x - y) * (x + y) / r, y: 2 * x * y / r };
        },
        polar: (x, y) => ({ x: Math.atan2(y, x) / Math.PI, y: Math.sqrt(x * x + y * y) - 1 }),
        heart: (x, y) => {
            const r = Math.sqrt(x * x + y * y);
            const theta = Math.atan2(y, x) * r;
            return { x: r * Math.sin(theta), y: -r * Math.cos(theta) };
        },
        julia: (x, y) => {
            const r = Math.sqrt(Math.sqrt(x * x + y * y));
            const theta = Math.atan2(y, x) / 2 + (Math.random() < 0.5 ? 0 : Math.PI);
            return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
        },
    };

    runChaosGame() {
        let p = { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 };
        let c = { r: Math.random(), g: Math.random(), b: Math.random() };

        let xforms = [...this.params.xforms];
        
        // SOLUCIÓN ELEGANTE PARA TRANSFORMACIÓN ÚNICA: Añadir una transformación de identidad
        // invisible para crear la dinámica fractal necesaria. Esto es crucial.
        if (xforms.length === 1) {
            xforms.push({
                variation: 'linear',
                coefs: [1, 0, 0, 0, 1, 0], // No hace nada
                weight: 0.1,
                color: { r: c.r, g: c.g, b: c.b }
            });
        }
        
        const totalWeight = xforms.reduce((sum, xf) => sum + xf.weight, 0);
        const cumulativeWeights = [];
        let currentWeight = 0;
        for (const xform of xforms) {
            currentWeight += xform.weight / totalWeight;
            cumulativeWeights.push(currentWeight);
        }

        for (let i = 0; i < this.params.quality; i++) {
            const rand = Math.random();
            let xformIndex = cumulativeWeights.findIndex(w => rand < w);
            if (xformIndex === -1) xformIndex = xforms.length - 1;
            
            const xform = xforms[xformIndex];

            const af = xform.coefs;
            const x_aff = af[0] * p.x + af[1] * p.y + af[2];
            const y_aff = af[3] * p.x + af[4] * p.y + af[5];

            const variationFunc = this.variations[xform.variation] || this.variations.linear;
            let newP = variationFunc(x_aff, y_aff);
            
            // Control de estabilidad: si el punto "explota", se reinicia
            if (!isFinite(newP.x) || !isFinite(newP.y) || Math.hypot(newP.x, newP.y) > 10) {
                p = { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 };
                continue;
            }
            p = newP;
            
            const xformColor = xform.color;
            c.r = (c.r + xformColor.r) / 2;
            c.g = (c.g + xformColor.g) / 2;
            c.b = (c.b + xformColor.b) / 2;

            if (i > 20) this.plotPoint(p, c);
        }
    }

    plotPoint(p, c) {
        const scale = 4.0;
        const canvasX = Math.floor(this.width / 2 + p.x * (this.width / scale));
        const canvasY = Math.floor(this.height / 2 - p.y * (this.height / scale));

        if (canvasX >= 0 && canvasX < this.width && canvasY >= 0 && canvasY < this.height) {
            const index = canvasY * this.width + canvasX;
            const pixel = this.histogram[index];
            pixel[0] += c.r;
            pixel[1] += c.g;
            pixel[2] += c.b;
            pixel[3]++;
            if (pixel[3] > this.maxAlpha) this.maxAlpha = pixel[3];
        }
    }

    renderToCanvas() {
        const imageData = this.ctx.createImageData(this.width, this.height);
        const data = imageData.data;
        const logMaxAlpha = this.maxAlpha > 0 ? Math.log10(this.maxAlpha) : 1;
        const gamma = 1 / this.params.gamma;

        for (let i = 0; i < this.histogram.length; i++) {
            const alpha = this.histogram[i][3];
            if (alpha > 0) {
                const pixel = this.histogram[i];
                const brightness = Math.log10(alpha) / logMaxAlpha * this.params.brightness;
                
                const r = Math.pow(pixel[0] / alpha * brightness, gamma);
                const g = Math.pow(pixel[1] / alpha * brightness, gamma);
                const b = Math.pow(pixel[2] / alpha * brightness, gamma);

                const dataIndex = i * 4;
                data[dataIndex] = r * 255;
                data[dataIndex + 1] = g * 255;
                data[dataIndex + 2] = b * 255;
                data[dataIndex + 3] = 255;
            }
        }
        this.ctx.putImageData(imageData, 0, 0);
    }

    async render() {
        this.runChaosGame();
        this.renderToCanvas();
    }
}