const path = require('path');
const fs   = require('fs');
const fsp  = fs.promises;
const { PNG } = require('pngjs');

const RESOURCE   = GetCurrentResourceName();
const RES_PATH   = GetResourcePath(RESOURCE);
const OUTPUT_DIR = path.resolve(path.join(RES_PATH, 'shots'));

try {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
} catch (err) {
    console.log('^1[uz_AutoShot]^0 Output dir error: ' + err.message);
}

function stripDataUri(b64) {
    if (typeof b64 !== 'string') return b64;
    if (!b64.startsWith('data:')) return b64;
    const comma = b64.indexOf(',');
    return comma === -1 ? b64 : b64.slice(comma + 1);
}

const ACE_RESTRICTED = GetConvar('uz_autoshot_ace_restricted', 'false') === 'true';
const ACE_COMMAND    = GetConvar('uz_autoshot_command', 'shotmaker');
const ACE_NAME       = 'command.' + ACE_COMMAND;

function checkAce(src) {
    if (!ACE_RESTRICTED) return true;
    return IsPlayerAceAllowed(src.toString(), ACE_NAME);
}

// This runs on the server's main thread, so every pixel pass below is sliced into
// row chunks and yields between them — a full-resolution frame is several million
// pixels and processing one in a single go stalls the whole server.
const ROWS_PER_SLICE = 64;
const nextTick = () => new Promise((resolve) => setImmediate(resolve));

// pngjs's sync codec inflates and deflates on the calling thread, so a full-resolution
// source frame decodes with zero ticks in between — the one block left that the row
// slicing above cannot break up. The stream API runs zlib on the libuv pool and delivers
// the result in chunks, so the server keeps ticking through a decode.
function decodeFrame(buf) {
    return new Promise((resolve, reject) => {
        new PNG().parse(buf, (err, png) => (err ? reject(err) : resolve(png)));
    });
}

function encodeFrame(png) {
    return new Promise((resolve, reject) => {
        const out = new PNG({ width: png.width, height: png.height, colorType: 6 });
        out.data = png.data;
        out.gamma = png.gamma;
        const chunks = [];
        out.on('data', (chunk) => chunks.push(chunk));
        out.on('end', () => resolve(Buffer.concat(chunks)));
        out.on('error', reject);
        out.pack();
    });
}

async function applyChromaKey(png, mode) {
    const d = png.data;
    const w = png.width, h = png.height;
    let removed = 0;
    const isMagenta = mode === 'magenta';

    for (let y0 = 0; y0 < h; y0 += ROWS_PER_SLICE) {
        const yEnd = Math.min(y0 + ROWS_PER_SLICE, h);
        const end = yEnd * w * 4;

        for (let i = y0 * w * 4; i < end; i += 4) {
            const r = d[i], g = d[i + 1], b = d[i + 2];
            let keyness = 0;

            if (isMagenta) {
                const rOverG = r - g;
                const bOverG = b - g;
                const minOver = rOverG < bOverG ? rOverG : bOverG;
                const primary = r < b ? r : b;
                if (minOver > 0 && primary > 10) {
                    // Soft edge: gradual ramp from 0-20 dominance range
                    const edgeSoft = minOver < 20 ? minOver / 20 : 1;
                    const primarySoft = primary < 40 ? (primary - 10) / 30 : 1;
                    keyness = Math.min(1, (rOverG + bOverG) / (r + b + 1)) * edgeSoft * primarySoft;
                }
            } else {
                const gOverR = g - r;
                const gOverB = g - b;
                const minOver = gOverR < gOverB ? gOverR : gOverB;
                if (minOver > 0 && g > 10) {
                    const edgeSoft = minOver < 20 ? minOver / 20 : 1;
                    const primarySoft = g < 40 ? (g - 10) / 30 : 1;
                    keyness = Math.min(1, (gOverR + gOverB) / (g + 1)) * edgeSoft * primarySoft;
                }
            }

            if (keyness > 0) {
                d[i + 3] = (255 * (1 - keyness) + 0.5) | 0;
                // Despill: remove chroma color bleed from RGB
                if (isMagenta) {
                    d[i]     = (r - (r - g) * keyness + 0.5) | 0; // pull R toward G
                    d[i + 2] = (b - (b - g) * keyness + 0.5) | 0; // pull B toward G
                } else {
                    const cap = r > b ? r : b;
                    d[i + 1] = (g - (g - cap) * keyness + 0.5) | 0; // pull G toward max(R,B)
                }
                removed++;
            }
        }

        await nextTick();
    }

    console.log('^2[uz_AutoShot]^0 Chroma key (' + mode + '): ' + removed + '/' + (w * h) + ' pixels removed');
}

// Two-pass alpha feather: 5x5 box blur on alpha channel for smooth edges. Runs after
// the resize so it works on the thumbnail the server actually writes — at source
// resolution a 5px feather is sub-pixel once downscaled, and costs ~50 reads per
// source pixel to produce it.
async function featherAlpha(png) {
    const d = png.data;
    const w = png.width, h = png.height;
    const RADIUS = 2;
    if (w <= RADIUS * 2 || h <= RADIUS * 2) return;

    const KERNEL = (RADIUS * 2 + 1) * (RADIUS * 2 + 1);
    const totalPx = w * h;
    const src = new Uint8Array(totalPx);

    for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < totalPx; i++) src[i] = d[(i << 2) + 3];

        for (let y0 = RADIUS; y0 < h - RADIUS; y0 += ROWS_PER_SLICE) {
            const yEnd = Math.min(y0 + ROWS_PER_SLICE, h - RADIUS);

            for (let y = y0; y < yEnd; y++) {
                for (let x = RADIUS; x < w - RADIUS; x++) {
                    const idx = y * w + x;
                    const a = src[idx];
                    // Skip interior pixels (all neighbors same alpha)
                    if ((a === 0 || a === 255) &&
                        src[idx - 1] === a && src[idx + 1] === a &&
                        src[idx - w] === a && src[idx + w] === a) continue;

                    let sum = 0;
                    for (let ky = -RADIUS; ky <= RADIUS; ky++) {
                        const rowOff = (y + ky) * w + x;
                        for (let kx = -RADIUS; kx <= RADIUS; kx++) {
                            sum += src[rowOff + kx];
                        }
                    }
                    d[(idx << 2) + 3] = (sum / KERNEL + 0.5) | 0;
                }
            }

            await nextTick();
        }
    }
}

async function resizeFrame(src, targetW, targetH) {
    if (src.width === targetW && src.height === targetH) return src;

    // Center-crop to target aspect ratio first, then resize
    const srcAspect = src.width / src.height;
    const dstAspect = targetW / targetH;

    let cropX = 0, cropY = 0, cropW = src.width, cropH = src.height;
    if (srcAspect > dstAspect) {
        // Source is wider -> crop sides
        cropW = Math.round(src.height * dstAspect);
        cropX = Math.round((src.width - cropW) / 2);
    } else if (srcAspect < dstAspect) {
        // Source is taller -> crop top/bottom
        cropH = Math.round(src.width / dstAspect);
        cropY = Math.round((src.height - cropH) / 2);
    }

    const dst = new PNG({ width: targetW, height: targetH, fill: true });
    const sd = src.data, dd = dst.data;
    const sw = src.width;
    const xRatio = cropW / targetW;
    const yRatio = cropH / targetH;

    // Use area averaging for downscale (sharper), bilinear for upscale
    const isDownscale = cropW > targetW || cropH > targetH;

    if (isDownscale) {
        // Area averaging: each dst pixel = average of all overlapping src pixels
        for (let yc = 0; yc < targetH; yc += ROWS_PER_SLICE) {
            const yEnd = Math.min(yc + ROWS_PER_SLICE, targetH);

            for (let y = yc; y < yEnd; y++) {
                const sy0 = cropY + y * yRatio;
                const sy1 = cropY + (y + 1) * yRatio;
                const iy0 = sy0 | 0;
                const iy1 = Math.min((sy1 | 0) + 1, cropY + cropH);

                for (let x = 0; x < targetW; x++) {
                    const sx0 = cropX + x * xRatio;
                    const sx1 = cropX + (x + 1) * xRatio;
                    const ix0 = sx0 | 0;
                    const ix1 = Math.min((sx1 | 0) + 1, cropX + cropW);

                    let r = 0, g = 0, b = 0, a = 0, totalW = 0;

                    for (let sy = iy0; sy < iy1; sy++) {
                        // Vertical weight: how much of this row overlaps the dst pixel
                        const wy = (sy < sy0 ? 1 - (sy0 - sy) : sy + 1 > sy1 ? sy1 - sy : 1);
                        const rowOff = sy * sw;

                        for (let sx = ix0; sx < ix1; sx++) {
                            // Horizontal weight: how much of this column overlaps
                            const wx = (sx < sx0 ? 1 - (sx0 - sx) : sx + 1 > sx1 ? sx1 - sx : 1);
                            const w = wx * wy;
                            const si = (rowOff + sx) << 2;
                            r += sd[si]     * w;
                            g += sd[si + 1] * w;
                            b += sd[si + 2] * w;
                            a += sd[si + 3] * w;
                            totalW += w;
                        }
                    }

                    const di = (y * targetW + x) << 2;
                    const inv = 1 / totalW;
                    dd[di]     = (r * inv + 0.5) | 0;
                    dd[di + 1] = (g * inv + 0.5) | 0;
                    dd[di + 2] = (b * inv + 0.5) | 0;
                    dd[di + 3] = (a * inv + 0.5) | 0;
                }
            }

            await nextTick();
        }
    } else {
        // Bilinear interpolation for upscale
        const maxCropX = cropX + cropW - 1;
        const maxCropY = cropY + cropH - 1;

        for (let yc = 0; yc < targetH; yc += ROWS_PER_SLICE) {
            const yEnd = Math.min(yc + ROWS_PER_SLICE, targetH);

            for (let y = yc; y < yEnd; y++) {
                const srcY = cropY + y * yRatio;
                const y0 = srcY | 0;
                const y1 = y0 < maxCropY ? y0 + 1 : maxCropY;
                const yf = srcY - y0;
                const yf1 = 1 - yf;
                const rowA = y0 * sw;
                const rowB = y1 * sw;

                for (let x = 0; x < targetW; x++) {
                    const srcX = cropX + x * xRatio;
                    const x0 = srcX | 0;
                    const x1 = x0 < maxCropX ? x0 + 1 : maxCropX;
                    const xf = srcX - x0;
                    const xf1 = 1 - xf;

                    const i00 = (rowA + x0) << 2;
                    const i10 = (rowA + x1) << 2;
                    const i01 = (rowB + x0) << 2;
                    const i11 = (rowB + x1) << 2;
                    const di  = (y * targetW + x) << 2;

                    const w00 = xf1 * yf1, w10 = xf * yf1, w01 = xf1 * yf, w11 = xf * yf;
                    dd[di]     = (sd[i00]     * w00 + sd[i10]     * w10 + sd[i01]     * w01 + sd[i11]     * w11 + 0.5) | 0;
                    dd[di + 1] = (sd[i00 + 1] * w00 + sd[i10 + 1] * w10 + sd[i01 + 1] * w01 + sd[i11 + 1] * w11 + 0.5) | 0;
                    dd[di + 2] = (sd[i00 + 2] * w00 + sd[i10 + 2] * w10 + sd[i01 + 2] * w01 + sd[i11 + 2] * w11 + 0.5) | 0;
                    dd[di + 3] = (sd[i00 + 3] * w00 + sd[i10 + 3] * w10 + sd[i01 + 3] * w01 + sd[i11 + 3] * w11 + 0.5) | 0;
                }
            }

            await nextTick();
        }
    }

    // Light sharpen on RGB after downscale (3x3 unsharp: center 5, neighbors -1)
    if (isDownscale) {
        const STRENGTH = 0.3;
        for (let yc = 1; yc < targetH - 1; yc += ROWS_PER_SLICE) {
            const yEnd = Math.min(yc + ROWS_PER_SLICE, targetH - 1);

            for (let y = yc; y < yEnd; y++) {
                for (let x = 1; x < targetW - 1; x++) {
                    const ci = (y * targetW + x) << 2;
                    // Skip fully transparent pixels
                    if (dd[ci + 3] === 0) continue;
                    const t = (ci - (targetW << 2));     // top row
                    const b = (ci + (targetW << 2));     // bottom row
                    for (let c = 0; c < 3; c++) {
                        const sharp = 5 * dd[ci + c] - dd[t + c] - dd[b + c] - dd[ci - 4 + c] - dd[ci + 4 + c];
                        const blended = dd[ci + c] + (sharp - dd[ci + c]) * STRENGTH;
                        dd[ci + c] = blended < 0 ? 0 : blended > 255 ? 255 : (blended + 0.5) | 0;
                    }
                }
            }

            await nextTick();
        }
    }

    console.log('^2[uz_AutoShot]^0 Crop+Resize: ' + src.width + 'x' + src.height + ' -> ' + cropW + 'x' + cropH + ' -> ' + targetW + 'x' + targetH + (isDownscale ? ' (area avg + sharpen)' : ' (bilinear)'));
    return dst;
}

const MAX_DIM = 4096;

function clampDim(v) {
    return Math.min(Math.max(v, 16), MAX_DIM);
}

// Decode once, key, resize, feather, encode once. Returns a PNG object.
async function buildFrame(imageData, transparent, chromaKey, wantWidth, wantHeight) {
    const raw = Buffer.from(stripDataUri(imageData), 'base64');
    if (!raw || raw.length === 0) return null;

    let png = await decodeFrame(raw);
    if (transparent) await applyChromaKey(png, chromaKey);
    if (wantWidth > 0 && wantHeight > 0) {
        png = await resizeFrame(png, clampDim(wantWidth), clampDim(wantHeight));
    }
    if (transparent) await featherAlpha(png);
    return png;
}

function safeOutputPath(xFilename, ext) {
    const outputPath = path.resolve(path.join(OUTPUT_DIR, xFilename + '.' + ext));
    if (!outputPath.startsWith(OUTPUT_DIR + path.sep)) return null;
    return outputPath;
}

async function writeOutput(outputPath, data) {
    await fsp.mkdir(path.dirname(outputPath), { recursive: true });
    await fsp.writeFile(outputPath, data);
}

// ════════════════════════════════════════════════════════
// UPLOAD QUEUE
// One job at a time, and the client is told when a job is done so it holds the next
// capture until this one is written. Without that the client keeps firing captures
// while the server is still chewing on the previous frame and the backlog grows
// until the server misses its tick long enough to drop everyone.
// ════════════════════════════════════════════════════════

const MAX_QUEUE = 16;
const queue = [];
let draining = false;

function ackClient(src) {
    emitNet('uz_autoshot:client:uploadDone', src);
}

function enqueue(src, run) {
    if (queue.length >= MAX_QUEUE) {
        console.log('^1[uz_AutoShot]^0 Queue full (' + MAX_QUEUE + '); dropped a capture from player ' + src);
        ackClient(src);
        return;
    }
    queue.push({ src: src, run: run });
    if (!draining) drain();
}

async function drain() {
    draining = true;
    while (queue.length > 0) {
        const job = queue.shift();
        await nextTick();
        try {
            await job.run();
        } catch (err) {
            console.log('^1[uz_AutoShot]^0 Process error: ' + (err && err.message ? err.message : err));
        }
        ackClient(job.src);
        await nextTick();
    }
    draining = false;
}

const MAX_PAYLOAD_BYTES = 20 * 1024 * 1024;
const MAX_B64_LEN = Math.ceil(MAX_PAYLOAD_BYTES * 4 / 3) + 64;

function badFilename(name) {
    return !name || /[\\/]\.\.(?:[\\/]|$)/.test(name) || path.isAbsolute(name);
}

onNet('uz_autoshot:server:processCapture', (payload) => {
    const src = source;
    if (!checkAce(src)) {
        console.log('^1[uz_AutoShot]^0 Refused capture: player ' + src + ' lacks ' + ACE_NAME);
        return;
    }
    if (!payload || typeof payload !== 'object') return;

    const xFilename  = typeof payload.filename === 'string' ? payload.filename : '';
    const wantFormat = typeof payload.format === 'string' ? payload.format.toLowerCase() : 'png';
    const wantTransp = payload.transparent === true || payload.transparent === '1' || payload.transparent === 1;
    const chromaKey  = typeof payload.chromaKey === 'string' ? payload.chromaKey.toLowerCase() : 'green';
    const wantWidth  = parseInt(payload.width)  || 0;
    const wantHeight = parseInt(payload.height) || 0;
    const imageData  = payload.imageData;

    if (badFilename(xFilename)) {
        console.log('^1[uz_AutoShot]^0 Refused capture: invalid filename: ' + xFilename);
        ackClient(src);
        return;
    }
    if (typeof imageData !== 'string' || imageData.length === 0) {
        console.log('^1[uz_AutoShot]^0 Refused capture: empty image data for ' + xFilename);
        ackClient(src);
        return;
    }
    if (imageData.length > MAX_B64_LEN) {
        console.log('^1[uz_AutoShot]^0 Refused capture: payload too large for ' + xFilename);
        ackClient(src);
        return;
    }

    const ext = wantTransp ? 'png' : wantFormat;
    const wantResize = wantWidth > 0 && wantHeight > 0;
    if (wantResize && !wantTransp && ext !== 'png') {
        console.log('^3[uz_AutoShot]^0 Resize requires PNG format; skipping for ' + ext);
    }

    enqueue(src, async () => {
        let outputData;

        if (wantTransp || (wantResize && ext === 'png')) {
            const png = await buildFrame(
                imageData,
                wantTransp,
                chromaKey,
                ext === 'png' && wantResize ? wantWidth : 0,
                ext === 'png' && wantResize ? wantHeight : 0,
            );
            if (!png) {
                console.log('^1[uz_AutoShot]^0 Refused capture: invalid base64 for ' + xFilename);
                return;
            }
            outputData = await encodeFrame(png);
        } else {
            outputData = Buffer.from(stripDataUri(imageData), 'base64');
            if (!outputData || outputData.length === 0) {
                console.log('^1[uz_AutoShot]^0 Refused capture: invalid base64 for ' + xFilename);
                return;
            }
        }

        const outputPath = safeOutputPath(xFilename, ext);
        if (!outputPath) {
            console.log('^1[uz_AutoShot]^0 Refused capture: path traversal blocked for ' + xFilename);
            return;
        }

        await writeOutput(outputPath, outputData);

        const sizeKB = Math.round(outputData.length / 1024);
        const label = wantTransp ? 'bg removed' : ext;
        console.log('^2[uz_AutoShot]^0 Saved: ' + xFilename + '.' + ext + ' (' + sizeKB + ' KB, ' + label + ')');
    });
});

// ════════════════════════════════════════════════════════
// AUTO FRONT/BACK TATTOO PICKING
// Tattoos that share a zone (e.g. torso front vs back) get captured from multiple camera
// angles. We keep whichever angle shows the most "ink" — measured as the pixel difference
// from a bare-skin baseline taken at the same angle.
// ════════════════════════════════════════════════════════

const tattooBaselines = {};  // key: `${src}|${angleKey}` -> processed PNG object

// Count opaque pixels where the candidate differs from the baseline beyond a threshold.
// Both frames are the same pose/angle, so the only real difference is the tattoo ink.
function inkScore(cand, base) {
    if (cand.width !== base.width || cand.height !== base.height) return -1;
    const da = cand.data, db = base.data;
    let score = 0;
    for (let i = 0; i < da.length; i += 4) {
        if (da[i + 3] < 20) continue;  // ignore off-body (transparent) pixels
        const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
        if (d > 40) score++;
    }
    return score;
}

onNet('uz_autoshot:server:processTattooBaseline', (payload) => {
    const src = source;
    if (!checkAce(src)) return;
    if (!payload || typeof payload !== 'object') return;

    const angleKey   = typeof payload.angleKey === 'string' ? payload.angleKey : '';
    const chromaKey  = typeof payload.chromaKey === 'string' ? payload.chromaKey.toLowerCase() : 'green';
    const transp     = payload.transparent === true || payload.transparent === '1' || payload.transparent === 1;
    const wantWidth  = parseInt(payload.width)  || 0;
    const wantHeight = parseInt(payload.height) || 0;
    const imageData  = payload.imageData;

    if (!angleKey || typeof imageData !== 'string' || imageData.length === 0) return;
    if (imageData.length > MAX_B64_LEN) return;

    enqueue(src, async () => {
        const png = await buildFrame(imageData, transp, chromaKey, wantWidth, wantHeight);
        if (!png) return;
        tattooBaselines[src + '|' + angleKey] = png;
        console.log('^2[uz_AutoShot]^0 Tattoo baseline cached: ' + angleKey + ' (player ' + src + ')');
    });
});

onNet('uz_autoshot:server:processTattooAuto', (payload) => {
    const src = source;
    if (!checkAce(src)) {
        console.log('^1[uz_AutoShot]^0 Refused tattoo capture: player ' + src + ' lacks ' + ACE_NAME);
        return;
    }
    if (!payload || typeof payload !== 'object') return;

    const xFilename  = typeof payload.filename === 'string' ? payload.filename : '';
    const wantFormat = typeof payload.format === 'string' ? payload.format.toLowerCase() : 'png';
    const wantTransp = payload.transparent === true || payload.transparent === '1' || payload.transparent === 1;
    const chromaKey  = typeof payload.chromaKey === 'string' ? payload.chromaKey.toLowerCase() : 'green';
    const wantWidth  = parseInt(payload.width)  || 0;
    const wantHeight = parseInt(payload.height) || 0;
    const angles     = Array.isArray(payload.angles) ? payload.angles : [];

    if (badFilename(xFilename)) {
        console.log('^1[uz_AutoShot]^0 Refused tattoo capture: invalid filename: ' + xFilename);
        ackClient(src);
        return;
    }
    if (angles.length === 0) {
        ackClient(src);
        return;
    }

    const ext = wantTransp ? 'png' : wantFormat;
    const wantResize = wantWidth > 0 && wantHeight > 0 && ext === 'png';

    enqueue(src, async () => {
        let best = null;  // { score, png, key } — angle with the most ink wins; ties keep the first (front)

        for (const a of angles) {
            if (!a || typeof a.imageData !== 'string' || a.imageData.length === 0) continue;
            if (a.imageData.length > MAX_B64_LEN) continue;
            const key = typeof a.key === 'string' ? a.key : '';

            let processed = null;
            try {
                processed = await buildFrame(
                    a.imageData,
                    wantTransp,
                    chromaKey,
                    wantResize ? wantWidth : 0,
                    wantResize ? wantHeight : 0,
                );
            } catch (e) {
                console.log('^3[uz_AutoShot]^0 Tattoo frame skipped (' + key + '): ' + e.message);
            }
            if (!processed) continue;

            let score = 0;
            const base = tattooBaselines[src + '|' + key];
            if (base) {
                const s = inkScore(processed, base);
                if (s > 0) score = s;
            }
            if (!best || score > best.score) best = { score: score, png: processed, key: key };
        }

        if (!best) {
            console.log('^3[uz_AutoShot]^0 Tattoo auto: no usable frame for ' + xFilename);
            return;
        }

        const outputPath = safeOutputPath(xFilename, ext);
        if (!outputPath) {
            console.log('^1[uz_AutoShot]^0 Refused tattoo capture: path traversal blocked for ' + xFilename);
            return;
        }

        await writeOutput(outputPath, await encodeFrame(best.png));
        console.log('^2[uz_AutoShot]^0 Saved (auto-angle ' + best.key + ', ink ' + best.score + '): ' + xFilename + '.' + ext);
    });
});

onNet('uz_autoshot:server:setBucket', (bucket) => {
    const src = source;
    if (!checkAce(src)) {
        console.log('^1[uz_AutoShot]^0 Refused setBucket: player ' + src + ' lacks ' + ACE_NAME);
        return;
    }
    SetPlayerRoutingBucket(src.toString(), bucket);
    console.log('^2[uz_AutoShot]^0 Player ' + src + ' -> bucket ' + bucket);
});

onNet('uz_autoshot:server:resetBucket', () => {
    const src = source;
    if (!checkAce(src)) {
        console.log('^1[uz_AutoShot]^0 Refused resetBucket: player ' + src + ' lacks ' + ACE_NAME);
        return;
    }
    SetPlayerRoutingBucket(src.toString(), 0);
    // Drop this player's cached tattoo baselines — they're only valid for one capture session.
    const prefix = src + '|';
    for (const k of Object.keys(tattooBaselines)) {
        if (k.startsWith(prefix)) delete tattooBaselines[k];
    }
    console.log('^2[uz_AutoShot]^0 Player ' + src + ' -> bucket 0');
});
