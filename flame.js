// flame.js
class FlameRenderer {
    constructor(canvas, params) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.params = params;
        this.histogram = new Float32Array(this.width * this.height * 4);
        this.maxCount = 0;
    }

    applyVariation(name, x, y, coefs) {
        const r2 = x * x + y * y;
        const r = Math.sqrt(r2);
        const theta = Math.atan2(y, x);

        switch (name) {
            case 'linear':     return { x, y };
            case 'sinusoidal': return { x: Math.sin(x), y: Math.sin(y) };
            case 'spherical':  return r2 < 1e-10 ? { x: 0, y: 0 } : { x: x / r2, y: y / r2 };
            case 'swirl':      return { x: x * Math.sin(r2) - y * Math.cos(r2), y: x * Math.cos(r2) + y * Math.sin(r2) };
            case 'horseshoe':  return r < 1e-10 ? { x: 0, y: 0 } : { x: (x - y) * (x + y) / r, y: 2 * x * y / r };
            case 'polar':      return { x: theta / Math.PI, y: r - 1 };
            case 'heart': {
                const t = theta * r;
                return { x: r * Math.sin(t), y: -r * Math.cos(t) };
            }
            case 'julia': {
                const sr = Math.pow(r2, 0.25);
                const t = theta / 2 + (Math.random() < 0.5 ? 0 : Math.PI);
                return { x: sr * Math.cos(t), y: sr * Math.sin(t) };
            }
            case 'disc': {
                const rpi = r * Math.PI;
                const tpi = theta / Math.PI;
                return { x: tpi * Math.sin(rpi), y: tpi * Math.cos(rpi) };
            }
            case 'spiral':     return r < 1e-10 ? { x: 0, y: 0 } : { x: (Math.cos(theta) + Math.sin(r)) / r, y: (Math.sin(theta) - Math.cos(r)) / r };
            case 'hyperbolic': return r < 1e-10 ? { x: 0, y: 0 } : { x: Math.sin(theta) / r, y: r * Math.cos(theta) };
            case 'diamond':    return { x: Math.sin(theta) * Math.cos(r), y: Math.cos(theta) * Math.sin(r) };
            case 'ex': {
                const n0 = Math.sin(theta + r), n1 = Math.cos(theta - r);
                const n03 = n0 * n0 * n0, n13 = n1 * n1 * n1;
                return { x: r * (n03 + n13), y: r * (n03 - n13) };
            }
            case 'eyefish': {
                const s = 2 / (r + 1);
                return { x: s * x, y: s * y };
            }
            case 'bubble': {
                const s = 4 / (r2 + 4);
                return { x: s * x, y: s * y };
            }
            case 'cylinder':   return { x: Math.sin(x), y };
            case 'fisheye': {
                const s = 2 / (r + 1);
                return { x: s * y, y: s * x };
            }
            case 'bent':       return { x: x < 0 ? 2 * x : x, y: y < 0 ? y / 2 : y };
            case 'waves': {
                const b = coefs[1], c = coefs[2], e = coefs[4], f = coefs[5];
                return { x: x + b * Math.sin(y / (c * c + 1e-8)), y: y + e * Math.sin(x / (f * f + 1e-8)) };
            }
            case 'popcorn': {
                const cv = coefs[2] || 0.1, fv = coefs[5] || 0.1;
                return { x: x + cv * Math.sin(Math.tan(3 * y)), y: y + fv * Math.sin(Math.tan(3 * x)) };
            }
            case 'pdj': {
                const [a, b, c, d] = coefs;
                return { x: Math.sin(a * y) - Math.cos(b * x), y: Math.sin(c * x) - Math.cos(d * y) };
            }
            default: return { x, y };
        }
    }

    plotPoint(px, py, cr, cg, cb) {
        const scale = this.params.scale || 3.0;
        const cx = Math.floor(this.width / 2 + px * (this.width / scale));
        const cy = Math.floor(this.height / 2 - py * (this.height / scale));
        if (cx >= 0 && cx < this.width && cy >= 0 && cy < this.height) {
            const idx = (cy * this.width + cx) * 4;
            this.histogram[idx]     += cr;
            this.histogram[idx + 1] += cg;
            this.histogram[idx + 2] += cb;
            this.histogram[idx + 3]++;
            if (this.histogram[idx + 3] > this.maxCount) this.maxCount = this.histogram[idx + 3];
        }
    }

    async runChaosGame() {
        const CHUNK_SIZE = 100000;
        let px = Math.random() * 2 - 1, py = Math.random() * 2 - 1;
        let cr = Math.random(), cg = Math.random(), cb = Math.random();

        const xforms = [...this.params.xforms];
        if (xforms.length === 1) {
            xforms.push({ variation: 'linear', coefs: [0.5, 0, 0, 0, 0.5, 0], weight: 0.1, color: { r: 1, g: 1, b: 1 } });
        }

        const totalWeight = xforms.reduce((s, xf) => s + xf.weight, 0);
        const cumWeights = [];
        let cw = 0;
        for (const xf of xforms) { cw += xf.weight / totalWeight; cumWeights.push(cw); }

        const symmetry = this.params.symmetry || 1;
        const symAngles = Array.from({ length: symmetry - 1 }, (_, k) => 2 * Math.PI * (k + 1) / symmetry);
        const symCos = symAngles.map(Math.cos);
        const symSin = symAngles.map(Math.sin);

        const total = this.params.quality;
        for (let i = 0; i < total; i++) {
            if (i > 0 && i % CHUNK_SIZE === 0) {
                await new Promise(r => setTimeout(r, 0));
            }

            const rand = Math.random();
            let xi = 0;
            while (xi < cumWeights.length - 1 && cumWeights[xi] < rand) xi++;

            const xf = xforms[xi];
            const af = xf.coefs;
            const xa = af[0] * px + af[1] * py + af[2];
            const ya = af[3] * px + af[4] * py + af[5];
            const np = this.applyVariation(xf.variation, xa, ya, af);

            if (!isFinite(np.x) || !isFinite(np.y) || Math.hypot(np.x, np.y) > 10) {
                px = Math.random() * 2 - 1;
                py = Math.random() * 2 - 1;
                continue;
            }
            px = np.x;
            py = np.y;

            cr = (cr + xf.color.r) / 2;
            cg = (cg + xf.color.g) / 2;
            cb = (cb + xf.color.b) / 2;

            if (i > 20) {
                this.plotPoint(px, py, cr, cg, cb);
                for (let s = 0; s < symAngles.length; s++) {
                    this.plotPoint(
                        px * symCos[s] - py * symSin[s],
                        px * symSin[s] + py * symCos[s],
                        cr, cg, cb
                    );
                }
            }
        }
    }

    renderToCanvas() {
        const transparent = this.params.background === 'transparent';
        const imageData = this.ctx.createImageData(this.width, this.height);
        const data = imageData.data;
        const logMax = this.maxCount > 0 ? Math.log10(this.maxCount) : 1;
        const gamma = 1 / this.params.gamma;

        for (let i = 0; i < this.width * this.height; i++) {
            const idx = i * 4;
            const count = this.histogram[idx + 3];
            if (count === 0) continue;

            const brightness = Math.log10(count) / logMax * this.params.brightness;
            const r = Math.min(1, Math.pow(this.histogram[idx]     / count * brightness, gamma));
            const g = Math.min(1, Math.pow(this.histogram[idx + 1] / count * brightness, gamma));
            const b = Math.min(1, Math.pow(this.histogram[idx + 2] / count * brightness, gamma));

            data[idx]     = r * 255;
            data[idx + 1] = g * 255;
            data[idx + 2] = b * 255;
            data[idx + 3] = transparent ? Math.min(255, brightness * 255) : 255;
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    async render() {
        await this.runChaosGame();
        this.renderToCanvas();
    }
}
