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

    async runChaosGame() {
        const CHUNK_SIZE = 100000;
        let p = { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 };
        let c = { r: Math.random(), g: Math.random(), b: Math.random() };

        let xforms = [...this.params.xforms];

        // Ensure at least two transforms for proper fractal dynamics
        if (xforms.length === 1) {
            xforms.push({
                variation: 'linear',
                coefs: [1, 0, 0, 0, 1, 0],
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

        const total = this.params.quality;
        for (let i = 0; i < total; i++) {
            // Yield to browser periodically so UI stays responsive
            if (i > 0 && i % CHUNK_SIZE === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            const rand = Math.random();
            let xformIndex = cumulativeWeights.findIndex(w => rand < w);
            if (xformIndex === -1) xformIndex = xforms.length - 1;

            const xform = xforms[xformIndex];
            const af = xform.coefs;
            const x_aff = af[0] * p.x + af[1] * p.y + af[2];
            const y_aff = af[3] * p.x + af[4] * p.y + af[5];

            const variationFunc = this.variations[xform.variation] || this.variations.linear;
            const newP = variationFunc(x_aff, y_aff);

            // Reset if point escapes bounds
            if (!isFinite(newP.x) || !isFinite(newP.y) || Math.hypot(newP.x, newP.y) > 10) {
                p = { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 };
                continue;
            }
            p = newP;

            c.r = (c.r + xform.color.r) / 2;
            c.g = (c.g + xform.color.g) / 2;
            c.b = (c.b + xform.color.b) / 2;

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
        const transparent = this.params.background === 'transparent';
        const imageData = this.ctx.createImageData(this.width, this.height);
        const data = imageData.data;
        const logMaxAlpha = this.maxAlpha > 0 ? Math.log10(this.maxAlpha) : 1;
        const gamma = 1 / this.params.gamma;

        for (let i = 0; i < this.histogram.length; i++) {
            const hitCount = this.histogram[i][3];
            if (hitCount === 0) continue;

            const pixel = this.histogram[i];
            const brightness = Math.log10(hitCount) / logMaxAlpha * this.params.brightness;

            const r = Math.min(1, Math.pow(pixel[0] / hitCount * brightness, gamma));
            const g = Math.min(1, Math.pow(pixel[1] / hitCount * brightness, gamma));
            const b = Math.min(1, Math.pow(pixel[2] / hitCount * brightness, gamma));

            const di = i * 4;
            data[di]     = Math.floor(r * 255);
            data[di + 1] = Math.floor(g * 255);
            data[di + 2] = Math.floor(b * 255);
            // Transparent mode: use brightness as alpha so faint areas fade out naturally
            data[di + 3] = transparent ? Math.floor(Math.min(1, brightness) * 255) : 255;
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    async render() {
        await this.runChaosGame();
        this.renderToCanvas();
    }
}
