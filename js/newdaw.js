let audioCtx = null;
let isPlaying = false;
let bpm = 140;
let nextStepTime = 0.0;
const scheduleAheadTime = 0.1;
let timerID = null;

// --- CONFIGURACIÓN DE PLAYLIST ---
let playlistEvents = []; 
let PIXELS_PER_BEAT = 100;
let zoomLevel = 1.0;
let currentPlayheadBeat = 0.0;

// --- CONFIGURACIÓN DE SNAP ---
let snapBeats = 0.25;

// --- SAMPLES DINÁMICOS ---
const audioBuffers = [];
const filters = [];
const sampleNames = [];
const activeSources = []; // Track de sources activos para poder detenerlos
const sampleUrls = [
    '../assets/audio/kick.wav',
    '../assets/audio/snare.wav',
    '../assets/audio/hihat.wav',
    '../assets/audio/openhat.wav',
    '../assets/audio/industrial_synth.wav'
];

function getSecondsPerBeat() { return 60.0 / bpm; }
function pxToBeat(px) { return px / PIXELS_PER_BEAT; }
function beatToPx(beat) { return beat * PIXELS_PER_BEAT; }

function snapPixel(px) {
    if (snapBeats === 0) return px;
    const snapPx = snapBeats * PIXELS_PER_BEAT;
    return Math.round(px / snapPx) * snapPx;
}

// --- 1. CARGA E INICIALIZACIÓN ---
async function initAudio() {
    if (audioCtx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return alert("Web Audio API not supported.");
    
    try {
        audioCtx = new AudioContextClass();
    } catch (e) { return console.error(e); }

    await Promise.allSettled(sampleUrls.map(async (url, i) => {
        await loadSampleFromUrl(url, i);
    }));
}

async function loadSampleFromUrl(url, index) {
    if (!audioCtx) return;
    if (!filters[index]) {
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 3500;
        filter.connect(audioCtx.destination);
        filters[index] = filter;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    audioBuffers[index] = await audioCtx.decodeAudioData(arrayBuffer);
    sampleNames[index] = url.split('/').pop();
}

async function loadSampleFromFile(file) {
    if (!audioCtx) await initAudio();
    if (!audioCtx) return;
    const index = audioBuffers.length;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3500;
    filter.connect(audioCtx.destination);
    filters[index] = filter;
    try {
        const arrayBuffer = await file.arrayBuffer();
        audioBuffers[index] = await audioCtx.decodeAudioData(arrayBuffer);
        sampleNames[index] = file.name;
        addSampleToBrowser(index, file.name, true);
    } catch (e) {
        console.error("Error decoding audio:", e);
        alert("Could not load audio file: " + file.name);
    }
}

function addSampleToBrowser(index, name, isCustom) {
    const sampleList = document.getElementById('sample-list');
    if (!sampleList) return;

    // Evitar duplicados: si ya existe un sample con el mismo nombre, no agregarlo
    const existing = sampleList.querySelectorAll('.sample-item');
    for (const ex of existing) {
        if (ex.textContent === name) {
            ex.dataset.sampleIndex = index;
            return;
        }
    }

    const item = document.createElement('div');
    item.classList.add('sample-item');
    if (isCustom) item.classList.add('custom');
    item.setAttribute('draggable', 'true');
    item.dataset.sampleIndex = index;
    item.textContent = name;
    setupSampleDrag(item, index);
    sampleList.appendChild(item);
}

// --- 2. DRAG & DROP (Mouse + Touch) ---
const timeline = document.getElementById('playlist-timeline');
const tracks = document.querySelectorAll('.playlist-track');

let snapGuide = null;
function showSnapGuide(x) {
    if (!snapGuide) {
        snapGuide = document.createElement('div');
        snapGuide.classList.add('snap-guide');
        timeline.appendChild(snapGuide);
    }
    snapGuide.style.left = x + "px";
    snapGuide.style.display = 'block';
}
function hideSnapGuide() {
    if (snapGuide) snapGuide.style.display = 'none';
}

// Configurar drag para samples (mouse + touch)
function setupSampleDrag(item, sampleIndex) {
    // Mouse: HTML5 drag & drop
    item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('action', 'create');
        e.dataTransfer.setData('sampleIndex', String(sampleIndex));
    });

    // Touch: drag manual
    item.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const startX = touch.clientX;
        const startY = touch.clientY;

        // Crear ghost del sample
        const ghost = item.cloneNode(true);
        ghost.style.position = 'fixed';
        ghost.style.zIndex = '9999';
        ghost.style.pointerEvents = 'none';
        ghost.style.opacity = '0.8';
        ghost.style.left = (startX - 40) + 'px';
        ghost.style.top = (startY - 15) + 'px';
        document.body.appendChild(ghost);

        function onMove(ev) {
            ev.preventDefault();
            const t = ev.touches[0];
            ghost.style.left = (t.clientX - 40) + 'px';
            ghost.style.top = (t.clientY - 15) + 'px';

            // Detectar track bajo el dedo
            const targetTrack = getTrackAtPoint(t.clientX, t.clientY);
            if (targetTrack) {
                const rect = timeline.getBoundingClientRect();
                const offsetX = t.clientX - rect.left + timeline.parentElement.scrollLeft;
                showSnapGuide(snapPixel(offsetX));
            } else {
                hideSnapGuide();
            }
        }

        function onEnd(ev) {
            const t = ev.changedTouches[0];
            ghost.remove();
            hideSnapGuide();

            const targetTrack = getTrackAtPoint(t.clientX, t.clientY);
            if (targetTrack) {
                const rect = timeline.getBoundingClientRect();
                const offsetX = t.clientX - rect.left + timeline.parentElement.scrollLeft;
                const snappedX = snapPixel(offsetX);
                const trackIndex = parseInt(targetTrack.dataset.track, 10);
                createBlock(sampleIndex, trackIndex, snappedX);
            }

            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        }

        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    }, { passive: false });
}

// Encuentra el track bajo un punto de la pantalla
function getTrackAtPoint(x, y) {
    for (const track of tracks) {
        const rect = track.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            return track;
        }
    }
    return null;
}

// Inicializar drag en samples existentes
document.querySelectorAll('.sample-item').forEach(item => {
    const idx = parseInt(item.dataset.sampleIndex, 10);
    setupSampleDrag(item, idx);
});

// Drag & drop con mouse en tracks
tracks.forEach(track => {
    track.addEventListener('dragover', (e) => {
        e.preventDefault();
        const rect = timeline.getBoundingClientRect();
        const offsetX = e.clientX - rect.left + timeline.parentElement.scrollLeft;
        showSnapGuide(snapPixel(offsetX));
    });

    track.addEventListener('dragleave', () => hideSnapGuide());

    track.addEventListener('drop', (e) => {
        e.preventDefault();
        hideSnapGuide();
        const action = e.dataTransfer.getData('action');
        const rect = timeline.getBoundingClientRect();
        const offsetX = e.clientX - rect.left + timeline.parentElement.scrollLeft;
        const snappedX = snapPixel(offsetX);
        const trackIndex = parseInt(track.dataset.track, 10);

        if (action === 'create') {
            const sampleIndex = parseInt(e.dataTransfer.getData('sampleIndex'), 10);
            createBlock(sampleIndex, trackIndex, snappedX);
        } else if (action === 'move') {
            const id = e.dataTransfer.getData('blockId');
            moveBlock(id, trackIndex, snappedX);
        }
    });
});

function createBlock(sampleIndex, trackIndex, posX) {
    const id = "block_" + Date.now() + Math.random().toString(36).substr(2, 4);
    const block = document.createElement('div');
    block.classList.add('playlist-block');
    block.id = id;
    block.setAttribute('draggable', 'true');
    block.style.left = posX + "px";
    
    const buffer = audioBuffers[sampleIndex];
    const fullDuration = buffer ? buffer.duration : 1.0;
    const widthPx = (fullDuration / getSecondsPerBeat()) * PIXELS_PER_BEAT;
    const minPx = snapBeats > 0 ? snapBeats * PIXELS_PER_BEAT : 25;
    block.style.width = Math.max(minPx, widthPx) + "px"; 

    // Canvas para dibujar la waveform
    const waveCanvas = document.createElement('canvas');
    waveCanvas.classList.add('waveform-canvas');
    waveCanvas.style.width = '100%';
    waveCanvas.style.height = '100%';
    waveCanvas.style.position = 'absolute';
    waveCanvas.style.top = '0';
    waveCanvas.style.left = '0';
    waveCanvas.style.pointerEvents = 'none';
    block.appendChild(waveCanvas);

    // Label del sample
    const blockLabel = document.createElement('span');
    blockLabel.classList.add('block-label');
    blockLabel.textContent = sampleNames[sampleIndex] || sampleUrls[sampleIndex].split('/').pop();
    blockLabel.style.position = 'relative';
    blockLabel.style.zIndex = '2';
    block.appendChild(blockLabel);

    // Dibujar la waveform
    if (buffer) {
        drawWaveform(waveCanvas, buffer, block.style.width);
    }

    const leftHandle = document.createElement('div');
    leftHandle.classList.add('trim-handle', 'left');
    const rightHandle = document.createElement('div');
    rightHandle.classList.add('trim-handle', 'right');
    block.appendChild(leftHandle);
    block.appendChild(rightHandle);

    // Mouse drag para mover
    block.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('trim-handle')) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('action', 'move');
        e.dataTransfer.setData('blockId', id);
    });

    // Touch drag para mover el bloque
    block.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('trim-handle')) return;
        e.preventDefault();
        const touch = e.touches[0];
        const startX = touch.clientX;
        const blockStartLeft = parseFloat(block.style.left);
        const timelineRect = timeline.getBoundingClientRect();

        function onMove(ev) {
            ev.preventDefault();
            const t = ev.touches[0];
            const dx = t.clientX - startX;
            let newLeft = blockStartLeft + dx;
            if (newLeft < 0) newLeft = 0;
            newLeft = snapPixel(newLeft);
            block.style.left = newLeft + "px";
            showSnapGuide(newLeft);
        }

        function onEnd(ev) {
            hideSnapGuide();
            const event = playlistEvents.find(ev2 => ev2.id === id);
            if (event) {
                event.startBeat = pxToBeat(parseFloat(block.style.left));
            }
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        }

        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    }, { passive: false });

    // Click derecho elimina
    block.addEventListener('mousedown', (e) => {
        if (e.button === 2) {
            e.preventDefault();
            playlistEvents = playlistEvents.filter(ev => ev.id !== id);
            block.remove();
        }
    });

    // Long press en mobile elimina
    let pressTimer = null;
    block.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('trim-handle')) return;
        pressTimer = setTimeout(() => {
            playlistEvents = playlistEvents.filter(ev => ev.id !== id);
            block.remove();
        }, 800);
    });
    block.addEventListener('touchmove', () => { clearTimeout(pressTimer); });
    block.addEventListener('touchend', () => { clearTimeout(pressTimer); });

    setupTrimHandle(block, leftHandle, rightHandle, id, 'left');
    setupTrimHandle(block, leftHandle, rightHandle, id, 'right');

    const event = {
        id: id,
        sampleIndex: sampleIndex,
        trackIndex: trackIndex,
        startBeat: pxToBeat(posX),
        offset: 0,
        duration: fullDuration,
        fullDuration: fullDuration,
        playbackRate: 1.0
    };
    playlistEvents.push(event);
    tracks[trackIndex].appendChild(block);
}

// Handle de recorte - mouse + touch
function setupTrimHandle(block, leftHandle, rightHandle, id, side) {
    const handle = side === 'left' ? leftHandle : rightHandle;

    function startTrim(clientX) {
        handle.classList.add('active');
        const event = playlistEvents.find(ev => ev.id === id);
        if (!event) return;

        const startX = clientX;
        const startLeft = parseFloat(block.style.left);
        const startWidth = parseFloat(block.style.width);
        const startOffset = event.offset;
        const startDuration = event.duration;
        const minPx = snapBeats > 0 ? snapBeats * PIXELS_PER_BEAT : 25;
        const secPerPx = getSecondsPerBeat() / PIXELS_PER_BEAT;

        function onMove(clientX) {
            const dx = clientX - startX;
            if (side === 'left') {
                let newLeft = startLeft + dx;
                let newWidth = startWidth - dx;
                if (newWidth < minPx) {
                    newWidth = minPx;
                    newLeft = startLeft + (startWidth - minPx);
                }
                if (newLeft < 0) {
                    newWidth = newWidth + newLeft;
                    newLeft = 0;
                }
                newLeft = snapPixel(newLeft);
                newWidth = startWidth - (newLeft - startLeft);
                if (newWidth < minPx) newWidth = minPx;

                block.style.left = newLeft + "px";
                block.style.width = newWidth + "px";

                const leftDeltaSec = (newLeft - startLeft) * secPerPx;
                event.offset = Math.max(0, startOffset + leftDeltaSec);
                event.duration = Math.max(minPx * secPerPx, startDuration - leftDeltaSec);
                event.startBeat = pxToBeat(newLeft);
            } else {
                // Right handle: estirar/achicar con auto-snap y playbackRate
                const currentLeft = parseFloat(block.style.left);
                let rightEdgeBeat = pxToBeat(currentLeft + Math.max(minPx, startWidth + dx));
                
                // Auto-snap a 1/4, 1/8, 1/16, 1/32
                rightEdgeBeat = autoSnapBeat(rightEdgeBeat);
                
                let newWidth = beatToPx(rightEdgeBeat) - currentLeft;
                if (newWidth < minPx) newWidth = minPx;

                block.style.width = newWidth + "px";
                
                // Calcular playbackRate: ratio entre ancho original y nuevo
                const originalWidthPx = (event.fullDuration / getSecondsPerBeat()) * PIXELS_PER_BEAT;
                event.playbackRate = originalWidthPx / newWidth;
                event.duration = newWidth * secPerPx;
                
                // Redibujar waveform estirada
                const canvas = block.querySelector('.waveform-canvas');
                const buffer = audioBuffers[event.sampleIndex];
                if (canvas && buffer) {
                    drawWaveform(canvas, buffer, newWidth + 'px');
                }
            }
        }

        function onMouseMove(ev) { onMove(ev.clientX); }
        function onTouchMove(ev) { ev.preventDefault(); onMove(ev.touches[0].clientX); }
        function onUp() {
            handle.classList.remove('active');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onUp);
    }

    handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startTrim(e.clientX);
    });

    handle.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startTrim(e.touches[0].clientX);
    }, { passive: false });
}

function moveBlock(id, newTrackIndex, newPosX) {
    const block = document.getElementById(id);
    const event = playlistEvents.find(ev => ev.id === id);
    if (block && event) {
        block.style.left = newPosX + "px";
        tracks[newTrackIndex].appendChild(block);
        event.trackIndex = newTrackIndex;
        event.startBeat = pxToBeat(newPosX);
    }
}

// --- 2b. DIBUJAR WAVEFORM ---
function drawWaveform(canvas, buffer, blockWidthPx, offsetSec, playbackRate) {
    const width = parseInt(blockWidthPx);
    const height = 59;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const rate = playbackRate && playbackRate > 0 ? playbackRate : 1.0;
    
    // Calcular rango de samples a dibujar basado en offset y playbackRate
    const startSample = Math.floor((offsetSec || 0) * sampleRate);
    // El número total de samples del buffer que se van a "consumir" 
    // = duración de salida * playbackRate * sampleRate
    // Pero más simple: samples visibles = (duración del buffer - offset) 
    // distribuidos en el ancho del bloque
    const totalBufferSamples = channelData.length;
    const availableSamples = totalBufferSamples - startSample;
    
    // Samples por pixel en el buffer (considerando playbackRate)
    // Si playbackRate < 1 (estirado), hay menos samples del buffer por pixel
    // Si playbackRate > 1 (comprimido), hay más samples del buffer por pixel
    const samplesPerPixel = Math.max(1, Math.floor(availableSamples / width));
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;

    const midY = height / 2;

    for (let x = 0; x < width; x++) {
        const s = startSample + x * samplesPerPixel;
        const e = Math.min(s + samplesPerPixel, totalBufferSamples);
        
        let minVal = 1.0;
        let maxVal = -1.0;
        
        for (let i = s; i < e; i++) {
            const val = channelData[i];
            if (val < minVal) minVal = val;
            if (val > maxVal) maxVal = val;
        }
        
        const yMin = midY + (minVal * midY * 0.9);
        const yMax = midY + (maxVal * midY * 0.9);
        
        ctx.beginPath();
        ctx.moveTo(x + 0.5, yMin);
        ctx.lineTo(x + 0.5, yMax);
        ctx.stroke();
    }
}

// --- 3. MOTOR DE AUDIO ---
function playSound(index, time, offset, duration, playbackRate) {
    if (!audioCtx || !audioBuffers[index] || !filters[index]) return;
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffers[index];
    source.connect(filters[index]);
    const rate = playbackRate && playbackRate > 0 ? playbackRate : 1.0;
    if (rate !== 1.0) {
        source.playbackRate.value = rate;
    }
    // Convertir offset y duration de tiempo de salida a tiempo del buffer
    const bufferOffset = (offset || 0) * rate;
    const bufferDuration = duration ? duration * rate : undefined;
    if (bufferDuration && bufferDuration > 0) {
        source.start(time, bufferOffset, bufferDuration);
    } else {
        source.start(time, bufferOffset);
    }
    activeSources.push(source);
    source.onended = () => {
        const i = activeSources.indexOf(source);
        if (i > -1) activeSources.splice(i, 1);
    };
}

// Auto-snap: encuentra el snap más cercano de [1, 0.5, 0.25, 0.125] para una posición en beats
function autoSnapBeat(beat) {
    const snapValues = [1, 0.5, 0.25, 0.125];
    let closest = snapValues[0];
    let minDiff = Math.abs(beat - Math.round(beat / closest) * closest);
    for (const s of snapValues) {
        const snapped = Math.round(beat / s) * s;
        const diff = Math.abs(beat - snapped);
        if (diff < minDiff) {
            minDiff = diff;
            closest = s;
        }
    }
    return Math.round(beat / closest) * closest;
}

function stopAllSources() {
    activeSources.forEach(s => {
        try { s.stop(); } catch (e) {}
        try { s.disconnect(); } catch (e) {}
    });
    activeSources.length = 0;
}

// Duración total del proyecto en beats (2400px / 100px por beat = 24 beats)
const MAX_BEATS = 24;

function nextNote() {
    const beatFraction = 0.25; 
    nextStepTime += beatFraction * getSecondsPerBeat();
    currentPlayheadBeat += beatFraction;
    // Loop: al llegar al final del grid, reiniciar desde el principio
    if (currentPlayheadBeat >= MAX_BEATS) {
        currentPlayheadBeat = 0.0;
        playedSampleIds.clear();
    }
}

// Track de samples ya reproducidos para no duplicar
let playedSampleIds = new Set();

function scheduler() {
    if (!audioCtx) return;
    while (nextStepTime < audioCtx.currentTime + scheduleAheadTime) {
        playlistEvents.forEach(event => {
            const eventEndBeat = event.startBeat + (event.duration / getSecondsPerBeat());
            
            // Sample nuevo que empieza en esta ventana
            if (event.startBeat >= currentPlayheadBeat && event.startBeat < currentPlayheadBeat + 0.25) {
                const timeOffset = (event.startBeat - currentPlayheadBeat) * getSecondsPerBeat();
                playSound(event.sampleIndex, nextStepTime + timeOffset, event.offset || 0, event.duration, event.playbackRate);
                // Marcar inmediatamente como reproducido para no re-disparar en el siguiente tick
                playedSampleIds.add(event.id);
            }
            // Sample en progreso: el playhead está en medio del sample (al reanudar)
            else if (event.startBeat < currentPlayheadBeat && currentPlayheadBeat < eventEndBeat && !playedSampleIds.has(event.id)) {
                // Calcular offset desde donde reanudar
                const elapsedBeats = currentPlayheadBeat - event.startBeat;
                const elapsedSec = elapsedBeats * getSecondsPerBeat();
                const resumeOffset = (event.offset || 0) + elapsedSec;
                const remainingDuration = event.duration - elapsedSec;
                if (remainingDuration > 0) {
                    playSound(event.sampleIndex, nextStepTime, resumeOffset, remainingDuration, event.playbackRate);
                }
                // Marcar inmediatamente como reproducido para no re-disparar en el siguiente tick
                playedSampleIds.add(event.id);
            }
            
            // Marcar samples como reproducidos cuando el playhead los pasa completamente
            if (currentPlayheadBeat >= eventEndBeat) {
                playedSampleIds.add(event.id);
            }
        });
        const drawTime = Math.max(0, (nextStepTime - audioCtx.currentTime) * 1000);
        const beatToDraw = currentPlayheadBeat;
        setTimeout(() => {
            if (!isPlaying) return;
            const playhead = document.getElementById('playlist-playhead');
            if (playhead) playhead.style.left = beatToPx(beatToDraw) + "px";
        }, drawTime);
        nextNote();
    }
}

// --- 4. INTERFAZ ---

// Botón Play/Pause: alterna entre reproducción y pausa
const playPauseBtn = document.getElementById('play-pause');
if (playPauseBtn) {
    playPauseBtn.onclick = async function () {
        if (!audioCtx) await initAudio();
        if (!audioCtx) return;
        if (audioCtx.state === 'suspended') await audioCtx.resume();

        isPlaying = !isPlaying;
        this.textContent = isPlaying ? "Pause" : "Play";
        this.classList.toggle('is-playing', isPlaying);

        if (isPlaying) {
            // Reanudar: siempre sincronizar nextStepTime con el tiempo actual
            nextStepTime = audioCtx.currentTime;
            timerID = setInterval(scheduler, 25);
        } else {
            // Pausa: detener scheduler y todos los sources activos
            clearInterval(timerID);
            timerID = null;
            stopAllSources();
            // Limpiar samples reproducidos para que puedan reanudarse al volver a play
            playedSampleIds.clear();
        }
    };
}

// Botón Stop: detiene todo, silencia el audio y resetea el playhead
const stopBtn = document.getElementById('stop-btn');
if (stopBtn) {
    stopBtn.onclick = async function () {
        // Detener scheduler
        clearInterval(timerID);
        timerID = null;
        isPlaying = false;

        // Resetear botón Play/Pause
        if (playPauseBtn) {
            playPauseBtn.textContent = "Play";
            playPauseBtn.classList.remove('is-playing');
        }

        // Detener todos los sources activos
        stopAllSources();

        // Suspendender el AudioContext para silenciar (sin destruirlo)
        if (audioCtx && audioCtx.state === 'running') {
            await audioCtx.suspend();
        }

        // Resetear el playhead y la posición al inicio
        currentPlayheadBeat = 0.0;
        nextStepTime = 0.0;
        playedSampleIds.clear();
        const playhead = document.getElementById('playlist-playhead');
        if (playhead) playhead.style.left = '0px';
    };
}

const bpmSlider = document.getElementById('bpm');
if (bpmSlider) {
    bpmSlider.oninput = (e) => {
        bpm = parseFloat(e.target.value) || 140;
        const display = document.getElementById('bpm-display');
        if (display) display.textContent = `${bpm} BPM`;
    };
}

const snapSelect = document.getElementById('snap-select');
if (snapSelect) {
    snapSelect.onchange = (e) => { snapBeats = parseFloat(e.target.value); };
}

// --- 5. ZOOM ---
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomDisplay = document.getElementById('zoom-display');

function applyZoom(newZoom) {
    zoomLevel = Math.max(0.25, Math.min(4.0, newZoom));
    const oldPxPerBeat = PIXELS_PER_BEAT;
    PIXELS_PER_BEAT = Math.round(100 * zoomLevel);
    
    if (zoomDisplay) zoomDisplay.textContent = Math.round(zoomLevel * 100) + '%';
    
    // Actualizar ancho del timeline y grid
    if (timeline) {
        timeline.style.width = (24 * PIXELS_PER_BEAT) + 'px';
        const beatPx = PIXELS_PER_BEAT;
        const subPx = PIXELS_PER_BEAT / 4;
        timeline.style.backgroundSize = beatPx + 'px ' + beatPx + 'px, ' + subPx + 'px ' + subPx + 'px';
    }
    
    // Reposicionar todos los bloques existentes
    const ratio = PIXELS_PER_BEAT / oldPxPerBeat;
    playlistEvents.forEach(event => {
        const block = document.getElementById(event.id);
        if (block) {
            const oldLeft = parseFloat(block.style.left);
            const oldWidth = parseFloat(block.style.width);
            const newLeft = oldLeft * ratio;
            const newWidth = oldWidth * ratio;
            block.style.left = newLeft + 'px';
            block.style.width = newWidth + 'px';
            
            // Redibujar waveform
            const canvas = block.querySelector('.waveform-canvas');
            const buffer = audioBuffers[event.sampleIndex];
            if (canvas && buffer) {
                drawWaveform(canvas, buffer, newWidth + 'px');
            }
        }
    });
    
    // Actualizar posición del playhead
    if (playhead) {
        playhead.style.left = beatToPx(currentPlayheadBeat) + 'px';
    }
}

if (zoomInBtn) {
    zoomInBtn.onclick = () => applyZoom(zoomLevel + 0.25);
}
if (zoomOutBtn) {
    zoomOutBtn.onclick = () => applyZoom(zoomLevel - 0.25);
}

const sampleUpload = document.getElementById('sample-upload');
if (sampleUpload) {
    sampleUpload.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) await loadSampleFromFile(file);
        sampleUpload.value = '';
    });
}

// --- 6. ARRASTRAR EL PLAYHEAD ---
const playhead = document.getElementById('playlist-playhead');

function setPlayheadFromClientX(clientX) {
    if (!timeline || !playhead) return;
    const rect = timeline.getBoundingClientRect();
    let x = clientX - rect.left + timeline.parentElement.scrollLeft;
    if (x < 0) x = 0;
    const maxPx = MAX_BEATS * PIXELS_PER_BEAT;
    if (x > maxPx) x = maxPx;
    // Aplicar snap
    x = snapPixel(x);
    playhead.style.left = x + "px";
    currentPlayheadBeat = pxToBeat(x);
    // Si está reproduciendo, ajustar el nextStepTime para continuar desde aquí
    if (isPlaying && audioCtx) {
        nextStepTime = audioCtx.currentTime;
    }
}

// --- 6b. CLICK/TOUCH EN ÁREA VACÍA DEL GRID PARA MOVER EL PLAYHEAD ---
if (timeline) {
    // Mouse: click en área vacía mueve el playhead
    timeline.addEventListener('mousedown', (e) => {
        // Solo si se clickeó directamente el timeline o un track (no un bloque ni handle)
        if (e.target === timeline || e.target.classList.contains('playlist-track')) {
            e.preventDefault();
            setPlayheadFromClientX(e.clientX);

            function onMove(ev) { setPlayheadFromClientX(ev.clientX); }
            function onUp() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            }
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }
    });

    // Touch: touch en área vacía mueve el playhead
    timeline.addEventListener('touchstart', (e) => {
        if (e.target === timeline || e.target.classList.contains('playlist-track')) {
            e.preventDefault();
            setPlayheadFromClientX(e.touches[0].clientX);

            function onMove(ev) {
                ev.preventDefault();
                setPlayheadFromClientX(ev.touches[0].clientX);
            }
            function onEnd() {
                document.removeEventListener('touchmove', onMove);
                document.removeEventListener('touchend', onEnd);
            }
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onEnd);
        }
    }, { passive: false });
}

if (playhead) {
    // Mouse
    playhead.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setPlayheadFromClientX(e.clientX);

        function onMove(ev) { setPlayheadFromClientX(ev.clientX); }
        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });

    // Touch
    playhead.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setPlayheadFromClientX(e.touches[0].clientX);

        function onMove(ev) {
            ev.preventDefault();
            setPlayheadFromClientX(ev.touches[0].clientX);
        }
        function onEnd() {
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        }
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    }, { passive: false });
}

// --- 7. ATAJOS DE TECLADO ---
document.addEventListener('keydown', async (e) => {
    // Space: Toggle - primera presión detiene donde está; segunda presión reproduce desde el principio
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
        e.preventDefault();

        if (isPlaying) {
            // Estaba reproduciendo → detener donde está (sin reiniciar posición)
            clearInterval(timerID);
            timerID = null;
            isPlaying = false;

            // Detener todos los sources activos
            stopAllSources();

            // Suspendender el AudioContext para silenciar (sin destruirlo)
            if (audioCtx && audioCtx.state === 'running') {
                await audioCtx.suspend();
            }

            // NO resetear el playhead - se queda donde estaba

            // Limpiar samples reproducidos para que puedan reanudarse al volver a play
            playedSampleIds.clear();

            // Actualizar botón
            if (playPauseBtn) {
                playPauseBtn.textContent = "Play";
                playPauseBtn.classList.remove('is-playing');
            }
        } else {
            // Estaba detenido → reanudar desde la posición actual del playhead
            if (!audioCtx) await initAudio();
            if (!audioCtx) return;
            if (audioCtx.state === 'suspended') await audioCtx.resume();

            // Detener sources residuales antes de empezar
            stopAllSources();

            // Resetear al inicio
            currentPlayheadBeat = 0.0;
            playedSampleIds.clear();
            const ph = document.getElementById('playlist-playhead');
            if (ph) ph.style.left = '0px';
            nextStepTime = audioCtx.currentTime;
            isPlaying = true;
            timerID = setInterval(scheduler, 25);

            // Actualizar botón
            if (playPauseBtn) {
                playPauseBtn.textContent = "Pause";
                playPauseBtn.classList.add('is-playing');
            }
        }
    }
});

// Inicializar audio al cargar la página para que las waveforms se dibujen desde el principio
window.addEventListener('load', () => {
    initAudio();
});

document.addEventListener('contextmenu', e => e.preventDefault());
