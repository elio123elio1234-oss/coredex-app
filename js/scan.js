/* ==================================================
   Scan Module
   Owns: AI worker, camera, render loop,
         keypoint smoothing, skeleton drawing,
         electrode computation and drawing,
         scan overlay open / close.
   ================================================== */

/* ---- DOM references ---- */
const _video     = document.getElementById('webcam');
const _canvas    = document.getElementById('outputCanvas');
const _container = document.getElementById('videoContainer');
const _ctx       = _canvas.getContext('2d');
const _overlay   = document.getElementById('scanOverlay');

/* ---- Worker & model state ---- */
const _worker = new Worker('worker.js?v=24');
let _workerBusy  = false;
let _modelReady  = false;
let _modelState  = 'initializing'; // 'initializing' | 'ready' | 'error'
let _modelError  = '';

function _updateModelStatus() {
    const row  = document.getElementById('modelStatusRow');
    const text = document.getElementById('modelStatusText');
    if (!row || !text) return;
    row.classList.remove('ready', 'error');
    if (_modelState === 'ready') {
        row.classList.add('ready');
        text.textContent = t('statusReady');
    } else if (_modelState === 'error') {
        row.classList.add('error');
        text.textContent = t('statusError') + _modelError;
    } else {
        text.textContent = t('statusInit');
    }
}

_worker.onmessage = (e) => {
    if (e.data.status === 'loaded') {
        _modelReady = true;
        _modelState = 'ready';
        _updateModelStatus();
    } else if (e.data.type === 'results') {
        for (let i = 0; i < 16; i++) {
            const pt = e.data.kpts[i];
            if (pt) {
                const cx = (pt.x / 640) * _canvas.width;
                const cy = (pt.y / 480) * _canvas.height;
                _targetKpts[i] = {
                    x: _kfFilters[i].x.update(cx),
                    y: _kfFilters[i].y.update(cy)
                };
            } else {
                _targetKpts[i] = null;
                _kfFilters[i].x.reset();
                _kfFilters[i].y.reset();
            }
        }
        setTimeout(() => { _workerBusy = false; }, 20);
    } else if (e.data.type === 'error') {
        _modelState = 'error';
        _modelError = e.data.message;
        _updateModelStatus();
        console.error('Worker Error:', e.data.message);
        setTimeout(() => { _workerBusy = false; }, 1000);
    }
};

/* ---- Kalman Filter 1D ---- */
// Reduces keypoint jitter without killing real motion.
// Q = process noise (how fast the true position can change)
// R = measurement noise (how noisy the model output is)
class KalmanFilter1D {
    constructor(Q = 1, R = 20) {
        this.Q = Q; this.R = R;
        this.x = 0; this.P = 1;
        this.ready = false;
    }
    update(z) {
        if (!this.ready) { this.x = z; this.ready = true; return z; }
        const P_pred = this.P + this.Q;
        const K      = P_pred / (P_pred + this.R);
        this.x = this.x + K * (z - this.x);
        this.P = (1 - K) * P_pred;
        return this.x;
    }
    reset() { this.ready = false; this.P = 1; }
}

// 16 keypoints × {x, y}
const _kfFilters = Array.from({ length: 16 }, () => ({
    x: new KalmanFilter1D(),
    y: new KalmanFilter1D()
}));


const _tmpCanvas = document.createElement('canvas');
_tmpCanvas.width  = 640;
_tmpCanvas.height = 640;
const _tmpCtx = _tmpCanvas.getContext('2d', { willReadFrequently: true });

/* ---- Keypoint state ---- */
let _smoothedKpts = new Array(23).fill(null);
let _targetKpts   = new Array(16).fill(null);
const SMOOTHING   = 0.35;

/* ---- Skeleton connection groups ---- */
const CONNECTIONS = {
    turquoise: { pairs: [[0, 1]], color: 'rgb(0, 200, 200)' },
    pink: {
        pairs: [[2,13],[2,10],[2,12],[12,10],[10,13],[14,3],[3,15],[11,15],[14,11],[11,3]],
        color: 'rgb(255, 50, 130)'
    },
    orange: { pairs: [[8,9],[6,7]], color: 'rgb(255, 120, 0)' },
    purple: {
        pairs: [[20,21],[20,22],[21,13],[20,10],[20,11],[22,14],[12,7],[15,9],
                [12,21],[12,4],[15,22],[15,5],[0,4],[0,5],[21,4],[22,5],
                [21,0],[20,4],[20,5],[22,0]],
        color: 'rgb(120, 80, 255)'
    }
};

/* ---- Electrode mode ---- */
let _electrodeMode = false;

/* ---- Overlay visibility ---- */
let _overlayHidden = false;

function toggleOverlay() {
    _overlayHidden = !_overlayHidden;
    const btn = document.getElementById('hideOverlayBtn');
    if (!btn) return;
    btn.classList.toggle('active', _overlayHidden);
    const lbl = btn.querySelector('span');
    if (lbl) lbl.textContent = _overlayHidden ? 'Show' : 'Hide';
    btn.querySelector('.icon-eye').style.display     = _overlayHidden ? 'none'  : '';
    btn.querySelector('.icon-eye-off').style.display = _overlayHidden ? ''      : 'none';
}

function toggleScanMode() {
    _electrodeMode = !_electrodeMode;
    _renderModeButton();
}

function _renderModeButton() {
    const lbl = document.getElementById('toggleBtnLabel');
    const btn = document.getElementById('toggleBtn');
    if (!lbl || !btn) return;
    lbl.textContent = _electrodeMode ? t('modeElectrodes') : t('modeSkeleton');
    btn.classList.toggle('mode-electrodes', _electrodeMode);
}

/* Expose for i18n re-render */
function refreshScanLabels() {
    _updateModelStatus();
    _renderModeButton();
    const scanTxt = document.getElementById('scanStatusText');
    if (scanTxt) scanTxt.textContent = t('scanStatusReady');
}

/* ---- Camera ---- */
let _stream = null;

async function _setupCamera() {
    _stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
    });
    _video.srcObject = _stream;
    return new Promise(resolve => {
        _video.onloadedmetadata = () => {
            _canvas.width  = _video.videoWidth;
            _canvas.height = _video.videoHeight;
            _container.style.aspectRatio = `${_video.videoWidth} / ${_video.videoHeight}`;
            resolve();
        };
    });
}

function _stopCamera() {
    _stream?.getTracks().forEach(t => t.stop());
    _stream = null;
    _video.srcObject = null;
}

/* ---- Frame dispatch ---- */
function _sendFrame() {
    if (_workerBusy || !_modelReady) return;
    _tmpCtx.drawImage(_video, 0, 0, 640, 640);
    const img = _tmpCtx.getImageData(0, 0, 640, 640);
    _workerBusy = true;
    _worker.postMessage({ type: 'frame', imgData: img }, [img.data.buffer]);
}

/* ---- Vector helpers ---- */
const _norm = v => Math.hypot(v.x, v.y);
const _sub  = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const _add  = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const _mul  = (v, s) => ({ x: v.x * s,   y: v.y * s   });
const _dot  = (a, b) => a.x * b.x + a.y * b.y;

/* ---- Virtual keypoints ---- */
function _computeVirtualPoints() {
    const k = _smoothedKpts;
    k[20] = (k[0] && k[1])  ? { x: (k[0].x+k[1].x)/2, y: (k[0].y+k[1].y)/2 } : null;
    k[21] = (k[4] && k[10]) ? { x: k[10].x, y: (k[4].y+k[10].y)/2 }           : null;
    k[22] = (k[5] && k[11]) ? { x: k[11].x, y: (k[5].y+k[11].y)/2 }           : null;
}

/* ---- Electrode positions ---- */
function _computeElectrodes() {
    const k     = _smoothedKpts;
    const valid = p => p != null;
    const leftOf  = (i, j) => (k[i] && k[j]) ? (k[i].x > k[j].x ? k[i] : k[j]) : (k[i] || k[j]);
    const rightOf = (i, j) => (k[i] && k[j]) ? (k[i].x < k[j].x ? k[i] : k[j]) : (k[i] || k[j]);

    const pJN = k[0], pXP = k[1], pIMF = k[2];
    const pAnchor   = leftOf(4, 5);
    const pOpposite = rightOf(4, 5);
    const pAAL = leftOf(6, 8);
    const pMAL = leftOf(7, 9);

    if (!valid(pJN) || !valid(pXP) || !valid(pAnchor)) return null;

    const vecS  = _sub(pXP, pJN);
    const lenS  = _norm(vecS);
    if (lenS < 1e-6) return null;

    const uS       = _mul(vecS, 1 / lenS);
    const dirVec   = _sub(pAnchor, pJN);
    const projY    = _dot(dirVec, uS);
    const chestVec = _sub(dirVec, _mul(uS, projY));
    const chestLen = _norm(chestVec);
    if (chestLen < 1e-6) return null;

    const uC  = _mul(chestVec, 1 / chestLen);
    const uO  = { x: -uC.x, y: -uC.y };
    const lo  = p => _dot(_sub(p, pJN), uC);
    const ld  = p => _dot(_sub(p, pJN), uS);
    const glob = (out, down) => _add(_add(pJN, _mul(uC, out)), _mul(uS, down));

    const pc4  = _add(pJN, _mul(vecS, 0.72));
    const dR   = valid(pOpposite) ? _norm(_sub(pJN, pOpposite)) : _norm(_sub(pJN, pAnchor));
    const dL   = _norm(_sub(pJN, pAnchor));
    const avgD = (dR + dL) / 2;
    const off  = 0.35 * avgD;

    const V2    = _add(pc4, _mul(uC, off));
    const V1    = _add(pc4, _mul(uO, off));
    const mcpOut = lo(pAnchor);
    const v4Down = valid(pIMF) ? ld(pIMF) : 0.85 * lenS + Math.abs(mcpOut) * 0.22;
    const V4     = glob(mcpOut, v4Down);
    const V3     = { x: (V2.x + V4.x) / 2, y: (V2.y + V4.y) / 2 };
    const v5Out  = valid(pAAL) ? lo(pAAL) : mcpOut + avgD * 0.3;
    const V5     = glob(v5Out, v4Down);
    const dAAL   = valid(pAAL) ? (v5Out - mcpOut) : avgD * 0.3;
    const v6Out  = valid(pMAL) ? lo(pMAL) : mcpOut + dAAL * 1.6;
    const V6     = glob(v6Out, v4Down);

    return { V1, V2, V3, V4, V5, V6 };
}

/* ---- Draw electrodes ---- */
const ELECTRODE_COLORS = {
    V1: 'rgb(255,59,48)',  V2: 'rgb(255,204,0)', V3: 'rgb(90,200,250)',
    V4: 'rgb(52,199,89)',  V5: 'rgb(175,82,222)', V6: 'rgb(0,122,255)'
};
function _drawElectrodes(elec, scale) {
    for (const [name, pos] of Object.entries(elec)) {
        _ctx.beginPath();
        _ctx.arc(pos.x, pos.y, 11 * scale, 0, 2 * Math.PI);
        _ctx.fillStyle = ELECTRODE_COLORS[name];
        _ctx.fill();
        _ctx.lineWidth   = 2.5 * scale;
        _ctx.strokeStyle = '#fff';
        _ctx.stroke();

        _ctx.save();
        _ctx.translate(pos.x, pos.y);
        _ctx.scale(-1, 1);
        _ctx.font         = `bold ${11 * scale}px -apple-system, sans-serif`;
        _ctx.textAlign    = 'center';
        _ctx.textBaseline = 'middle';
        _ctx.fillStyle    = name === 'V2' ? '#1d1d1f' : '#fff';
        _ctx.fillText(name, 0, scale);
        _ctx.restore();
    }
}

/* ---- Draw skeleton ---- */
function _drawSkeleton(scale) {
    for (const group of Object.values(CONNECTIONS)) {
        _ctx.strokeStyle = group.color;
        _ctx.lineWidth   = 3.5 * scale;
        _ctx.lineCap     = 'round';
        for (const [p1, p2] of group.pairs) {
            const a = _smoothedKpts[p1], b = _smoothedKpts[p2];
            if (a && b) {
                _ctx.beginPath();
                _ctx.moveTo(a.x, a.y);
                _ctx.lineTo(b.x, b.y);
                _ctx.stroke();
            }
        }
    }
    _ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const pt of _smoothedKpts) {
        if (pt) {
            _ctx.beginPath();
            _ctx.arc(pt.x, pt.y, 4.5 * scale, 0, 2 * Math.PI);
            _ctx.fill();
        }
    }
}

/* ---- Render loop ---- */
let _rafId = null;

function _renderLoop() {
    _ctx.drawImage(_video, 0, 0, _canvas.width, _canvas.height);
    const scale = _canvas.height / 480;

    for (let i = 0; i < 16; i++) {
        if (_targetKpts[i]) {
            if (!_smoothedKpts[i]) {
                _smoothedKpts[i] = { ..._targetKpts[i] };
            } else {
                _smoothedKpts[i].x += SMOOTHING * (_targetKpts[i].x - _smoothedKpts[i].x);
                _smoothedKpts[i].y += SMOOTHING * (_targetKpts[i].y - _smoothedKpts[i].y);
            }
        } else {
            _smoothedKpts[i] = null;
        }
    }

    _computeVirtualPoints();

    if (!_overlayHidden) {
        if (_electrodeMode) {
            const elec = _computeElectrodes();
            if (elec) _drawElectrodes(elec, scale);
        } else {
            _drawSkeleton(scale);
        }
    }

    _sendFrame();
    _rafId = requestAnimationFrame(_renderLoop);
}

/* ---- Public API ---- */
async function startScan() {
    const txt = document.getElementById('scanStatusText');
    if (txt) txt.textContent = t('scanStatusReady');
    _overlay.hidden = false;
    await _setupCamera();
    await _video.play();
    if (!_rafId) _renderLoop();
}

function exitScan() {
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
    _stopCamera();
    _overlay.hidden = true;
    _smoothedKpts = new Array(23).fill(null);
    _targetKpts   = new Array(16).fill(null);
}
