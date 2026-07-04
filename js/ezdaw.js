let audioCtx = null;
let isPlaying = false;
let currentStep = 0;
let bpm = 140;
let nextStepTime = 0.0;
const scheduleAheadTime = 0.1;
let timerID = null; 

// --- VARIABLES PARA EL RESIZE (ESTIRAMIENTO) ---
let isResizing = false;
let currentPad = null;
let startX, startWidth;

const notes = { "C4": 261.63, "B3": 246.94, "A3": 220.00, "G3": 196.00, "F3": 174.61, "E3": 164.81, "D3": 146.83, "C3": 130.81 };
// SOLUCIÓN BUG 2: Quitamos .slice(0, 7) para incluir las 8 notas que tienes en tu HTML sidebar
const noteNames = Object.keys(notes); 

// SOLUCIÓN BUG 1: Inicializamos arrays dinámicos vacíos para evitar desbordamientos
const audioBuffers = [];
const filters = [];
const sampleUrls = [
    '../assets/audio/kick.wav',
    '../assets/audio/snare.wav',
    '../assets/audio/hihat.wav',
    '../assets/audio/openhat.wav',
    '../assets/audio/industrial_synth.wav' // El sample del Synth es el índice 4
];

// --- 1. INICIALIZACIÓN DE AUDIO ---
async function initAudio() {
    if (audioCtx) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        console.error("Web Audio API no está disponible en este navegador.");
        alert("Tu navegador no soporta Web Audio API. Prueba con Chrome, Edge o Firefox actualizados.");
        return;
    }

    try {
        audioCtx = new AudioContextClass();
    } catch (e) {
        console.error("No se pudo crear el AudioContext:", e);
        return;
    }

    const loadResults = await Promise.allSettled(sampleUrls.map(async (url, i) => {
        // Creamos filtros dinámicamente asignados a cada canal
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 3000;
        filter.connect(audioCtx.destination);
        filters[i] = filter;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} al pedir ${url}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        audioBuffers[i] = await audioCtx.decodeAudioData(arrayBuffer);
    }));

    loadResults.forEach((result, i) => {
        if (result.status === "rejected") {
            console.error(`No se pudo cargar el sample #${i} (${sampleUrls[i]}):`, result.reason);
        }
    });

    const failedCount = loadResults.filter(r => r.status === "rejected").length;
    if (failedCount === sampleUrls.length) {
        alert("No se pudo cargar ningún sample de audio. Revisa las rutas en assets/audio.");
    }
}

// --- Helper: acceso seguro a elementos del DOM ---
function getEl(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`ezdaw: no se encontró el elemento #${id} en el DOM.`);
    return el;
}

function getNumericValue(id, fallback) {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const val = parseFloat(el.value);
    return Number.isFinite(val) ? val : fallback;
}

// --- 2. GENERACIÓN DE GRID DE BATERÍA ---
const sequencerGrid = document.getElementById('sequencer');
if (sequencerGrid) {
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 16; j++) {
            const pad = document.createElement('button');
            pad.type = 'button';
            pad.classList.add('pad');
            pad.dataset.row = i;
            pad.dataset.step = j;
            pad.onmousedown = (e) => {
                if (e.button === 2) pad.classList.remove('active');
                else if (e.button === 0) pad.classList.toggle('active');
            };
            sequencerGrid.appendChild(pad);
        }
    }
} else {
    console.warn("ezdaw: no se encontró #sequencer, la grilla de batería no se generó.");
}

// --- 3. GENERACIÓN DE PIANO ROLL ---
const pianoSequencer = document.getElementById('piano-sequencer');
if (pianoSequencer) {
    noteNames.forEach((note, rowIndex) => {
        for (let j = 0; j < 16; j++) {
            const pad = document.createElement('div');
            pad.classList.add('piano-pad');
            pad.style.left = (j * 100) + "px";
            pad.style.top = (rowIndex * 34) + "px";
            pad.style.width = "100px";
            pad.style.height = "34px";
            pad.dataset.note = note;
            pad.dataset.step = j;

            const resizer = document.createElement('div');
            resizer.classList.add('resizer');
            pad.appendChild(resizer);

            pad.onmousedown = (e) => {
                if (e.target.classList.contains('resizer')) return;

                if (e.button === 2) {
                    pad.classList.remove('active');
                    pad.style.width = "100px"; 
                } else if (e.button === 0) {
                    if (pad.classList.contains('active')) {
                        pad.classList.remove('active');
                        pad.style.width = "100px"; 
                    } else {
                        pad.classList.add('active');
                        if (audioCtx) playNote(note, audioCtx.currentTime);
                    }
                }
            };
            pianoSequencer.appendChild(pad);
        }
    });
} else {
    console.warn("ezdaw: no se encontró #piano-sequencer, el piano roll no se generó.");
}

// --- 4. LÓGICA DE RESIZE (ESTIRAMIENTO) ---
document.addEventListener('mousedown', e => {
    if (e.button === 0 && e.target.classList.contains('resizer')) {
        isResizing = true;
        currentPad = e.target.parentElement;
        startX = e.clientX;
        const computedWidth = parseInt(window.getComputedStyle(currentPad).width, 10);
        startWidth = Number.isFinite(computedWidth) ? computedWidth : 100;
        document.body.style.cursor = 'ew-resize';
        e.preventDefault();
    }
});

document.addEventListener('mousemove', e => {
    if (!isResizing || !currentPad) return;
    const deltaX = e.clientX - startX;
    const newWidth = startWidth + deltaX;
    const snappedWidth = Math.max(100, Math.round(newWidth / 50) * 50);
    currentPad.style.width = snappedWidth + 'px';
});

function endResize() {
    if (isResizing) {
        isResizing = false;
        currentPad = null;
        document.body.style.cursor = 'default';
    }
}
document.addEventListener('mouseup', endResize);
document.addEventListener('mouseleave', endResize);
window.addEventListener('blur', endResize);

// --- 5. LÓGICA DE AUDIO (REPRODUCCIÓN) ---
function playSound(index, time) {
    if (!audioCtx || !audioBuffers[index] || !filters[index]) return;

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffers[index];
    source.playbackRate.value = getNumericValue('drum-pitch-control', 1);
    source.connect(filters[index]);
    try {
        source.start(time);
    } catch (e) {
        console.error(`ezdaw: error al reproducir el sample #${index}:`, e);
    }
}

function playNote(note, time) {
    // El sample industrial_synth está en la posición 4
    if (!audioCtx || !audioBuffers[4]) return;
    if (!Object.prototype.hasOwnProperty.call(notes, note)) return;

    const decayValue = getNumericValue('piano-decay', 0.5);
    const activePads = document.querySelectorAll(`.piano-pad[data-note="${note}"].active`);
    let noteDuration = 0.15;

    activePads.forEach(p => {
        if (parseInt(p.dataset.step, 10) === currentStep) {
            const widthPx = parseInt(p.style.width, 10);
            const safeWidth = Number.isFinite(widthPx) ? widthPx : 100;
            noteDuration = (safeWidth / 100) * (60 / bpm / 4);
        }
    });

    if (!Number.isFinite(noteDuration) || noteDuration <= 0) noteDuration = 0.15;

    const source = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    source.buffer = audioBuffers[4];

    // --- Pitch (Afinación) ---
    const baseFreq = 130.81; // Frecuencia de C3 como base
    const playbackRate = notes[note] / baseFreq;
    source.playbackRate.setValueAtTime(playbackRate, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3500, time);
    filter.Q.setValueAtTime(8, time);

    const releaseTime = Number.isFinite(decayValue) && decayValue > 0 ? decayValue : 0.5;
    const totalDuration = noteDuration + releaseTime;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.4, time + 0.01);
    gain.gain.setValueAtTime(0.4, time + noteDuration);
    gain.gain.linearRampToValueAtTime(0.0001, time + totalDuration);
    
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    try {
        source.start(time);
        source.stop(time + totalDuration);
    } catch (e) {
        console.error(`ezdaw: error al reproducir la nota ${note}:`, e);
    }
}

// --- 6. MOTOR DE TIEMPO ---
function nextNote() {
    const secondsPerBeat = 60.0 / bpm;
    nextStepTime += 0.25 * secondsPerBeat;
    currentStep = (currentStep + 1) % 16;
}

function scheduleStep(step, time) {
    document.querySelectorAll(`.pad[data-step="${step}"].active`).forEach(p => {
        playSound(parseInt(p.dataset.row, 10), time);
    });
    document.querySelectorAll(`.piano-pad[data-step="${step}"].active`).forEach(p => {
        playNote(p.dataset.note, time);
    });

    const drawTime = Math.max(0, (time - audioCtx.currentTime) * 1000);
    setTimeout(() => {
        if (!isPlaying) return;

        const drumPadWidth = 30;    
        const drumGap = 8;          
        const drumPaddingLeft = 12; 

        const pianoStepWidth = 100; 

        const drumHead = document.getElementById('drum-playhead');
        const pianoHead = document.getElementById('playhead');
        
        if (drumHead) {
            drumHead.style.left = (drumPaddingLeft + (step * (drumPadWidth + drumGap))) + "px";
        }
        if (pianoHead) {
            pianoHead.style.left = (step * pianoStepWidth) + "px";
        }
    }, drawTime);
}

function scheduler() {
    if (!audioCtx) return;
    try {
        while (nextStepTime < audioCtx.currentTime + scheduleAheadTime) {
            scheduleStep(currentStep, nextStepTime);
            nextNote();
        }
    } catch (e) {
        console.error("ezdaw: error en el scheduler, deteniendo la reproducción:", e);
        stopPlayback();
    }
}

function stopPlayback() {
    isPlaying = false;
    if (timerID) {
        clearInterval(timerID);
        timerID = null;
    }
    const playBtn = document.getElementById('play-pause');
    if (playBtn) {
        playBtn.textContent = "Play";
        playBtn.classList.remove('is-playing');
    }
}

// --- 7. EVENTOS DE CONTROL ---
const playPauseBtn = getEl('play-pause');
if (playPauseBtn) {
    let isLoading = false;

    playPauseBtn.onclick = async function () {
        if (isLoading) return;

        if (!audioCtx) {
            isLoading = true;
            const originalText = this.textContent;
            this.disabled = true;
            this.textContent = "Cargando...";
            try {
                await initAudio();
            } finally {
                this.disabled = false;
                this.textContent = originalText;
                isLoading = false;
            }
        }

        if (!audioCtx) return;

        if (audioCtx.state === 'suspended') {
            try {
                await audioCtx.resume();
            } catch (e) {
                console.error("ezdaw: no se pudo reanudar el AudioContext:", e);
                return;
            }
        }

        isPlaying = !isPlaying;
        this.textContent = isPlaying ? "Stop" : "Play";
        this.classList.toggle('is-playing', isPlaying);

        if (isPlaying) {
            currentStep = 0;
            nextStepTime = audioCtx.currentTime;
            if (timerID) clearInterval(timerID);
            timerID = setInterval(scheduler, 25);
        } else if (timerID) {
            clearInterval(timerID);
            timerID = null;
        }
    };
}

const bpmSlider = getEl('bpm');
if (bpmSlider) {
    bpmSlider.oninput = (e) => {
        const parsed = parseFloat(e.target.value);
        bpm = Number.isFinite(parsed) ? Math.min(180, Math.max(60, parsed)) : bpm;
        const display = document.getElementById('bpm-display');
        if (display) display.textContent = `${bpm} BPM`;
    };
}

// Control individual para las perillas (Knobs de efectos)
document.querySelectorAll('.effects-panel .drum-pitch-slider[data-row]').forEach(slider => {
    slider.oninput = (e) => {
        const row = parseInt(e.target.dataset.row, 10);
        const value = parseFloat(e.target.value);
        if (filters[row] && Number.isFinite(value)) {
            filters[row].frequency.value = value;
        }
    };
});

document.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('beforeunload', () => {
    if (timerID) clearInterval(timerID);
});