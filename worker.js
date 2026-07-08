importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js');
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

let session;
const inputSize = 640;

async function initModel() {
    try {
        // --- v22: מודל חדש עם imgsz=640 ---
        session = await ort.InferenceSession.create('best_v22.onnx', { executionProviders: ['webgpu', 'webgl', 'wasm'] });
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
        const float32Data = new Float32Array(3 * inputSize * inputSize);
        
        for (let i = 0; i < inputSize * inputSize; i++) {
            float32Data[i] = imgData[i * 4] / 255.0;
            float32Data[inputSize * inputSize + i] = imgData[i * 4 + 1] / 255.0;
            float32Data[2 * inputSize * inputSize + i] = imgData[i * 4 + 2] / 255.0;
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