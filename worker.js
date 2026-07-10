importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js');
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

// Performance: multi-thread WASM fallback
ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
ort.env.wasm.simd = true;

let session;
const inputSize = 640;

// Pre-allocate once — avoids GC pressure per frame (~4.7 MB each alloc)
const float32Data = new Float32Array(3 * inputSize * inputSize);

async function initModel() {
    try {
        // v22: WebGPU high-perf → WebGL → WASM multi-thread
        session = await ort.InferenceSession.create('models/onnx/best_v26.onnx', {
            executionProviders: [
                { name: 'webgpu', powerPreference: 'high-performance' },
                'webgl',
                'wasm'
            ]
        });
        postMessage({ status: 'loaded' });
    } catch (e) {
        console.error("שגיאה בטעינת המודל: ", e);
        postMessage({ type: 'error', message: "לא הצלחנו לטעון את המודל: " + e.message });
    }
}

initModel();

onmessage = async function(e) {
    if (!session || e.data.type !== 'frame') return;

    try {
        const imgData = e.data.imgData.data;
        
        const n = inputSize * inputSize;
        for (let i = 0, j = 0; i < n; i++, j += 4) {
            float32Data[i]         = imgData[j]     * 0.00392156862; // /255
            float32Data[n + i]     = imgData[j + 1] * 0.00392156862;
            float32Data[2 * n + i] = imgData[j + 2] * 0.00392156862;
        }
        
        const inputTensor = new ort.Tensor('float32', float32Data, [1, 3, inputSize, inputSize]);
        
        const inputName = session.inputNames[0]; 
        const feeds = {};
        feeds[inputName] = inputTensor;
        
        const results = await session.run(feeds);
        const outputName = session.outputNames[0];
        const output = results[outputName];
        
        const numChannels = output.dims[1];
        const numAnchors = output.dims[2];
        const kptOffset = numChannels - (16 * 3);
        
        let bestScore = 0;
        let bestAnchor = -1;

        for (let i = 0; i < numAnchors; i++) {
            let score = output.data[4 * numAnchors + i]; 
            if (score > bestScore) {
                bestScore = score;
                bestAnchor = i;
            }
        }

        let parsedKpts = new Array(16).fill(null);

        if (bestScore > 0.5 && bestAnchor !== -1) {
            for (let k = 0; k < 16; k++) {
                let x = output.data[(kptOffset + k*3) * numAnchors + bestAnchor];
                let y = output.data[(kptOffset + k*3 + 1) * numAnchors + bestAnchor];
                let conf = output.data[(kptOffset + k*3 + 2) * numAnchors + bestAnchor];

                if (conf > 0.4) {
                    parsedKpts[k] = { 
                        x: (x / inputSize) * 640, 
                        y: (y / inputSize) * 480 
                    };
                }
            }
        }

        postMessage({ type: 'results', kpts: parsedKpts });

    } catch (error) {
        console.error("קריסה בזמן חישוב המודל:", error);
        postMessage({ type: 'error', message: error.message });
    }
};