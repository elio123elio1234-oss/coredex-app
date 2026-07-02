/* ==================================================
   AI Realtime Guide Module
   Integrates Google Gemini Multimodal Live API for
   real-time voice + vision AI assistance during scan.

   USAGE
   -----
   Call _AI.init() once after DOM is ready.
   The user toggles the feature via the "AI Guide" button.
   An API key modal appears on first use; the key is
   stored in localStorage (never sent anywhere except
   directly to Google's API over WSS).
   ================================================== */

const _AI = (() => {

    /* ---- Internal state ---- */
    let _ws            = null;
    let _active        = false;
    let _apiKey        = '';

    /* ---- Audio playback ---- */
    let _audioCtx      = null;
    let _nextPlayTime  = 0;

    /* ---- Microphone capture ---- */
    let _micStream     = null;
    let _micProcessor  = null;
    let _micSource     = null;

    /* ---- Video frame sending ---- */
    let _frameInterval = null;

    /* ---- DOM references (resolved lazily after init) ---- */
    let _aiBtn, _aiGuideBtnLabel, _aiModal,
        _aiKeyInput, _aiKeyConfirm, _aiKeyCancel,
        _aiStatusChip;

    /* ================================================================
       KEY STORAGE  (localStorage only, never leaves device)
    ================================================================ */
    function _getSavedKey() {
        return localStorage.getItem('cyphix_gemini_key') || '';
    }
    function _saveKey(key) {
        localStorage.setItem('cyphix_gemini_key', key);
    }

    /* ================================================================
       UI HELPERS
    ================================================================ */
    function _showModal() {
        _aiKeyInput.value = _getSavedKey();
        _aiModal.hidden = false;
        _aiKeyInput.focus();
    }
    function _hideModal() {
        _aiModal.hidden = true;
    }

    const STATUS_LABELS = {
        idle:       'AI Guide',
        connecting: 'Connecting…',
        active:     'Listening…',
        speaking:   'AI Speaking',
        error:      'AI Error'
    };

    function _setStatus(state) {
        if (!_aiBtn) return;
        // Remove all state classes
        ['ai-idle','ai-connecting','ai-active','ai-speaking','ai-error']
            .forEach(c => _aiBtn.classList.remove(c));
        _aiBtn.classList.add('ai-' + state);

        const label = STATUS_LABELS[state] || 'AI Guide';
        if (_aiGuideBtnLabel) _aiGuideBtnLabel.textContent = label;

        if (_aiStatusChip) {
            _aiStatusChip.textContent = label;
            _aiStatusChip.className = 'ai-status-chip ai-status-' + state;
            _aiStatusChip.hidden = (state === 'idle');
        }
    }

    /* ================================================================
       WEBSOCKET CONNECTION  (Gemini Multimodal Live)
    ================================================================ */
    let _connectTimeout = null;

    function _connect(apiKey) {
        _setStatus('connecting');

        /* v1beta endpoint — v1alpha is deprecated */
        const url = 'wss://generativelanguage.googleapis.com/ws/' +
            'google.ai.generativelanguage.v1beta.GenerativeService' +
            '.BidiGenerateContent?key=' + encodeURIComponent(apiKey);

        console.log('[AI Realtime] Connecting to Gemini Live API…');
        _ws = new WebSocket(url);

        /* Safety timeout — if setup not confirmed within 12 s, abort */
        _connectTimeout = setTimeout(() => {
            if (!_active) {
                console.error('[AI Realtime] Setup timeout — no response from server.');
                _disconnect();
                _setStatus('error');
                if (_aiGuideBtnLabel) _aiGuideBtnLabel.textContent = 'Timeout — retry';
                setTimeout(() => { if (!_active) _setStatus('idle'); }, 3000);
            }
        }, 12000);

        _ws.onopen = () => {
            console.log('[AI Realtime] WebSocket open — sending setup…');
            _ws.send(JSON.stringify({
                setup: {
                    model: 'models/gemini-3.1-flash-live-preview',
                    generationConfig: {
                        responseModalities: ['AUDIO'],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName: 'Aoede' }
                            }
                        }
                    },
                    systemInstruction: {
                        parts: [{
                            text: [
                                'You are the CYPHIX AI Coach — a friendly, real-time visual assistant that helps users correctly position an ECG sensor on their body, step by step.',
                                'This is a consumer wellness and training application. You are a coaching assistant, NOT a medical diagnostician. You do not diagnose, treat, or prescribe anything.',
                                'Your only job is to watch the live video feed and coach the user on sensor placement, posture, and readiness — like a personal trainer guiding an exercise.',
                                '',
                                '=== WHAT YOU SEE ON THE VIDEO ===',
                                'The app draws colored target circles directly on the video feed, showing WHERE each sensor should be placed on the chest:',
                                '  V1 = RED circle (right side of sternum, 4th intercostal space)',
                                '  V2 = YELLOW circle (left side of sternum, 4th intercostal space)',
                                '  V3 = LIGHT BLUE circle (between V2 and V4)',
                                '  V4 = GREEN circle (left midclavicular line, 5th intercostal space)',
                                '  V5 = PURPLE circle (anterior axillary line, same level as V4)',
                                '  V6 = DARK BLUE circle (midaxillary line, same level as V4 and V5)',
                                '',
                                '=== THE SENSOR ===',
                                'The user\'s sensor is the BLUE DOT visible on their smartwatch / wearable device on their wrist.',
                                'When the user presses the smartwatch sensor against their chest, a blue circle appears at the contact point on the video.',
                                'Your job is to compare where that blue contact dot is on the chest versus where the TARGET circle for the current step is.',
                                '',
                                '=== PLACEMENT IS SERIAL — ALWAYS ONE STEP AT A TIME ===',
                                'The user places the sensor on ONE position at a time, in this exact order: V1 → V2 → V3 → V4 → V5 → V6.',
                                'At any moment, ask yourself: "Which step are we on?" and guide accordingly.',
                                'Do NOT jump ahead. Do NOT ask about the next position until the current one is confirmed correct.',
                                '',
                                '=== YOUR COACHING CHECKLIST ===',
                                '',
                                'STEP A — READINESS CHECK (do this only at the start of the session):',
                                '  - Is the chest fully bare? If not: "Please remove your shirt so I can see your chest clearly."',
                                '  - Is the user sitting upright, back straight? If not: "Please sit up straight before we begin."',
                                '',
                                'STEP B — SENSOR PLACEMENT (for each V1–V6 position):',
                                '  - Tell the user which position to place the sensor on next.',
                                '  - Once they press the sensor, check: is the blue dot touching or overlapping the target colored circle?',
                                '  - YES → "Perfect! Now move to V2." (or the next step)',
                                '  - NO → "Move the sensor a bit to the LEFT / RIGHT / UP / DOWN until it touches the [COLOR] circle."',
                                '  - NEVER confirm a position as correct unless the blue dot is visually on the target circle.',
                                '  - If you cannot see clearly: "Can you move the camera a little closer? I need to see your chest more clearly."',
                                '',
                                '=== COMMUNICATION RULES ===',
                                '- Keep every reply to 1–3 SHORT sentences. This is a real-time voice session.',
                                '- Always reply in the same language the user speaks to you (Hebrew or English).',
                                '- Be encouraging, calm, and clear — like a good coach.',
                                '- If someone asks anything unrelated to sensor placement, gently redirect: "I\'m here to help you with sensor placement. Let\'s continue — place the sensor on [current position]."'
                            ].join('\n')
                        }]
                    }
                }
            }));
        };

        _ws.onmessage = _handleServerMessage;

        _ws.onerror = (err) => {
            console.error('[AI Realtime] WebSocket error:', err);
            /* onclose always fires after onerror — let it handle state reset */
        };

        _ws.onclose = (evt) => {
            clearTimeout(_connectTimeout);
            _connectTimeout = null;
            const wasActive = _active;
            _active = false;
            _stopMic();
            _stopFrameSending();
            _ws = null;
            _nextPlayTime = 0;

            if (wasActive) {
                _setStatus('idle');
            } else {
                const reason = evt.reason
                    ? evt.reason
                    : (evt.code === 1006 ? 'Check your API key & network.' : `Code ${evt.code}`);
                console.error('[AI Realtime] Closed before setup. Code:', evt.code, '|', reason);
                _setStatus('error');
                if (_aiGuideBtnLabel) _aiGuideBtnLabel.textContent = 'Connection Failed';
                setTimeout(() => { if (!_active) _setStatus('idle'); }, 3000);
            }
        };
    }

    /* ================================================================
       SERVER MESSAGE HANDLING
    ================================================================ */
    function _handleServerMessage(e) {
        const parseAndProcess = (text) => {
            let msg;
            try { msg = JSON.parse(text); } catch { return; }

            /* Setup confirmed — start mic + frames */
            if (msg.setupComplete) {
                _active = true;
                _setStatus('active');
                _startMic();
                _startFrameSending();
                return;
            }

            /* Model speaking — play audio */
            if (msg.serverContent) {
                const content = msg.serverContent;
                if (content.modelTurn && content.modelTurn.parts) {
                    content.modelTurn.parts.forEach(part => {
                        if (part.inlineData &&
                            part.inlineData.mimeType &&
                            part.inlineData.mimeType.startsWith('audio/')) {
                            _setStatus('speaking');
                            _playPCM(part.inlineData.data, part.inlineData.mimeType);
                        }
                    });
                }
                if (content.turnComplete) {
                    setTimeout(() => { if (_active) _setStatus('active'); }, 300);
                }
            }

            /* API error */
            if (msg.error) {
                console.error('[AI Realtime] API error:', msg.error);
                _setStatus('error');
            }
        };

        if (e.data instanceof Blob) {
            const reader = new FileReader();
            reader.onload = () => parseAndProcess(reader.result);
            reader.readAsText(e.data);
        } else {
            parseAndProcess(e.data);
        }
    }

    /* ================================================================
       AUDIO PLAYBACK  (PCM 16-bit LE → AudioContext)
    ================================================================ */
    function _ensureAudioCtx() {
        if (!_audioCtx) {
            _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (_audioCtx.state === 'suspended') _audioCtx.resume();
    }

    function _playPCM(base64, mimeType) {
        _ensureAudioCtx();

        /* Parse sample rate from MIME, e.g. "audio/pcm;rate=24000" */
        const rateMatch = mimeType.match(/rate=(\d+)/);
        const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;

        const raw   = atob(base64);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

        const numSamples = bytes.length / 2;
        const float32    = new Float32Array(numSamples);
        const view       = new DataView(bytes.buffer);
        for (let i = 0; i < numSamples; i++) {
            float32[i] = view.getInt16(i * 2, true) / 32768.0;
        }

        const buffer = _audioCtx.createBuffer(1, numSamples, sampleRate);
        buffer.copyToChannel(float32, 0);

        const now = _audioCtx.currentTime;
        if (_nextPlayTime < now) _nextPlayTime = now + 0.05; // small buffer

        const src = _audioCtx.createBufferSource();
        src.buffer = buffer;
        src.connect(_audioCtx.destination);
        src.start(_nextPlayTime);
        _nextPlayTime += buffer.duration;
    }

    /* ================================================================
       MICROPHONE CAPTURE  (ScriptProcessor → PCM → WebSocket)
    ================================================================ */
    async function _startMic() {
        try {
            _micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            _ensureAudioCtx();

            _micSource    = _audioCtx.createMediaStreamSource(_micStream);
            _micProcessor = _audioCtx.createScriptProcessor(4096, 1, 1);

            _micProcessor.onaudioprocess = (evt) => {
                if (!_active || !_ws || _ws.readyState !== WebSocket.OPEN) return;

                const float32        = evt.inputBuffer.getChannelData(0);
                const inputRate      = _audioCtx.sampleRate;
                const targetRate     = 16000;

                /* Simple linear downsampling if needed */
                let samples;
                if (inputRate !== targetRate) {
                    const ratio  = inputRate / targetRate;
                    const outLen = Math.round(float32.length / ratio);
                    samples = new Float32Array(outLen);
                    for (let i = 0; i < outLen; i++) {
                        samples[i] = float32[Math.min(Math.round(i * ratio), float32.length - 1)];
                    }
                } else {
                    samples = float32;
                }

                /* Float32 → Int16 PCM */
                const pcm16 = new Int16Array(samples.length);
                for (let i = 0; i < samples.length; i++) {
                    pcm16[i] = Math.max(-32768, Math.min(32767,
                        Math.round(samples[i] * 32767)));
                }

                _ws.send(JSON.stringify({
                    realtimeInput: {
                        audio: {
                            data: _bufToBase64(pcm16.buffer),
                            mimeType: 'audio/pcm;rate=16000'
                        }
                    }
                }));
            };

            /* Connect: source → processor → destination (required or onaudioprocess won't fire) */
            _micSource.connect(_micProcessor);
            _micProcessor.connect(_audioCtx.destination);

        } catch (err) {
            console.error('[AI Realtime] Microphone access error:', err);
            _setStatus('error');
        }
    }

    function _stopMic() {
        try { _micProcessor?.disconnect(); } catch {}
        try { _micSource?.disconnect(); }    catch {}
        _micStream?.getTracks().forEach(t => t.stop());
        _micProcessor = null;
        _micSource    = null;
        _micStream    = null;
    }

    /* ================================================================
       VIDEO FRAME SENDING  (Canvas snapshot → JPEG → WebSocket)
    ================================================================ */
    function _startFrameSending() {
        _frameInterval = setInterval(_sendFrame, 1000); // 1 frame/sec
    }

    function _stopFrameSending() {
        if (_frameInterval) { clearInterval(_frameInterval); _frameInterval = null; }
    }

    function _sendFrame() {
        if (!_active || !_ws || _ws.readyState !== WebSocket.OPEN) return;
        const srcCanvas = document.getElementById('outputCanvas');
        if (!srcCanvas) return;

        /* Resize to 640px wide to save bandwidth */
        const w = 640;
        const h = Math.round(srcCanvas.height * w / srcCanvas.width);

        const tmp    = document.createElement('canvas');
        tmp.width    = w;
        tmp.height   = h;
        const tmpCtx = tmp.getContext('2d');

        /* Un-mirror before sending (canvas is CSS-mirrored for display) */
        tmpCtx.save();
        tmpCtx.scale(-1, 1);
        tmpCtx.drawImage(srcCanvas, -w, 0, w, h);
        tmpCtx.restore();

        const base64 = tmp.toDataURL('image/jpeg', 0.55).split(',')[1];

        _ws.send(JSON.stringify({
            realtimeInput: {
                video: {
                    data: base64,
                    mimeType: 'image/jpeg'
                }
            }
        }));
    }

    /* ================================================================
       UTILITY
    ================================================================ */
    function _bufToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary  = '';
        const chunk = 8192;
        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        return btoa(binary);
    }

    /* ================================================================
       TOGGLE (public entry point)
    ================================================================ */
    function toggle() {
        /* Disconnect if already running */
        if (_active || (_ws && _ws.readyState === WebSocket.CONNECTING)) {
            _disconnect();
            return;
        }

        /* Need API key first */
        _apiKey = _getSavedKey();
        if (!_apiKey) {
            _showModal();
            return;
        }
        _connect(_apiKey);
    }

    function _disconnect() {
        clearTimeout(_connectTimeout);
        _connectTimeout = null;
        _active = false;      // mark as intended close BEFORE ws.close()
        _stopMic();
        _stopFrameSending();
        _nextPlayTime = 0;
        if (_ws) {
            /* Remove onclose so it doesn't fire the error path */
            _ws.onclose = null;
            _ws.onerror = null;
            try { _ws.close(1000, 'User disconnected'); } catch {}
            _ws = null;
        }
        _setStatus('idle');
    }

    /* ================================================================
       INIT
    ================================================================ */
    function init() {
        _aiBtn            = document.getElementById('aiGuideBtn');
        _aiGuideBtnLabel  = document.getElementById('aiGuideBtnLabel');
        _aiModal          = document.getElementById('aiKeyModal');
        _aiKeyInput       = document.getElementById('aiKeyInput');
        _aiKeyConfirm     = document.getElementById('aiKeyConfirm');
        _aiKeyCancel      = document.getElementById('aiKeyCancel');
        _aiStatusChip     = document.getElementById('aiStatusChip');

        if (!_aiBtn) return; // scan not in DOM yet — safe to skip

        _aiBtn.addEventListener('click', toggle);

        _aiKeyConfirm.addEventListener('click', () => {
            const key = _aiKeyInput.value.trim();
            if (!key) { _aiKeyInput.focus(); return; }
            _saveKey(key);
            _apiKey = key;
            _hideModal();
            _connect(key);
        });

        _aiKeyCancel.addEventListener('click', _hideModal);

        /* Close modal on backdrop click */
        _aiModal.addEventListener('click', (e) => {
            if (e.target === _aiModal) _hideModal();
        });

        /* Allow Enter key to confirm */
        _aiKeyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') _aiKeyConfirm.click();
        });

        _setStatus('idle');
    }

    /* Public API */
    return { init, toggle, disconnect: _disconnect };

})();
