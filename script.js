/// Elementos del DOM
const startButton = document.getElementById('start-audio');
const mainContent = document.getElementById('main-content');
const currentSoundElement = document.getElementById('current-sound');
const currentScaleElement = document.getElementById('current-scale');
const rootNoteSelect = document.getElementById('root-note');
const scaleTypeSelect = document.getElementById('scale-type');
const octave4Container = document.getElementById('octave-4');
const octave5Container = document.getElementById('octave-5');
const currentOctaveDisplay = document.getElementById('current-octave');

// Componentes de Tone.js
let synth;
let filter;
let bitCrusher;
let delay;
let masterVolume;
let activeNotes = {};

// Variables para controlar el estado del audio
let isAudioStarted = false;
let audioContextStarted = false;
let needsUserInteraction = true;

// Estado de la aplicación
let activeSound = 0;
let activeKeys = {};
let currentRootNote = 'C';
let currentScaleType = 'cromática';
let highlightedNotes = [];

// Configuración de octavas
let currentOctaveBase = 4; // Octava base (la inferior)
const OCTAVE_MIN = 1;
const OCTAVE_MAX = 7;

// Definir las notas en orden cromático
const allNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Definir patrones de intervalos para diferentes escalas
const scalePatterns = {
    'cromática': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    'mayor': [0, 2, 4, 5, 7, 9, 11],
    'menor': [0, 2, 3, 5, 7, 8, 10],
    'pentatónica mayor': [0, 2, 4, 7, 9],
    'pentatónica menor': [0, 3, 5, 7, 10],
    'blues': [0, 3, 5, 6, 7, 10],
    'dórica': [0, 2, 3, 5, 7, 9, 10],
    'frigia': [0, 1, 3, 5, 7, 8, 10],
    'lidia': [0, 2, 4, 6, 7, 9, 11],
    'mixolidia': [0, 2, 4, 5, 7, 9, 10]
};

// Definir el mapeo de teclas a notas (mapeo inicial, se actualizará según la octava)
let keyboardMap = {
    // Primera Octava
    'z': 'C4',
    's': 'C#4',
    'x': 'D4',
    'd': 'D#4',
    'c': 'E4',
    'v': 'F4',
    'g': 'F#4',
    'b': 'G4',
    'h': 'G#4',
    'n': 'A4',
    'j': 'A#4',
    'm': 'B4',
    
    // Segunda Octava
    'q': 'C5',
    '2': 'C#5',
    'w': 'D5',
    '3': 'D#5',
    'e': 'E5',
    'r': 'F5',
    '5': 'F#5',
    't': 'G5',
    '6': 'G#5',
    'y': 'A5',
    '7': 'A#5',
    'u': 'B5'
};

// Invertir el mapeo para buscar teclas por nota
let noteToKeyMap = {};
for (const [key, note] of Object.entries(keyboardMap)) {
    noteToKeyMap[note] = key;
}

// Configuración del sintetizador
const synthConfig = {
    oscillator: {
        type: 'sine',
    },
    envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.5,
        release: 0.5
    },
    filter: {
        frequency: 8000,
        Q: 2
    },
    bitcrusher: {
        bits: 8,
        wet: 0.5
    },
    volume: -6
};

// Variables globales
window.audioStarted = false;
window.fmSynth = null;
window.amSynth = null;
window.monoSynth = null;
window.fatOscillator = null;
window.currentSynthType = 'fm';
window.reverb = null;
window.activeNotes = {}; 
window.synth = null;
let arpeggiator = {
    isActive: false,
    mode: 'off',
    rate: 8,
    octaves: 1,
    notes: [],
    currentIndex: 0,
    interval: null,
    lastRandomNote: null
};
let currentScale = [];
let currentRoot = 'C';
let currentOctave = 4;

// Constantes para notas musicales
const NOTE_FREQUENCIES = {
    // ... existing code ...
};

// Cuando el DOM esté listo, inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM cargado, inicializando aplicación...");
    
    // Iniciar la aplicación sin esperar a un click
    startApp();
});

// Iniciar la aplicación
async function startApp() {
    try {
        // Configurar UI
        setupUI();
        
        // Configurar eventos de teclado
        setupKeyboardEvents();
        
        // Actualizar escala actual
        updateCurrentScale();
        
        // Inicializar audio después de un breve retraso
        setTimeout(async () => {
            await initializeTone();
        }, 500);
    } catch (error) {
        console.error("Error iniciando la aplicación:", error);
    }
}

// Inicializar Tone.js
async function initializeTone() {
    try {
        // Iniciar el contexto de audio
        console.log("Inicializando Tone.js...");
        await Tone.start();
        console.log("Contexto de audio iniciado: " + Tone.context.state);
        
        // Crear sintetizador básico si no existe
        if (!window.synth) {
            window.synth = new Tone.PolySynth(Tone.FMSynth).toDestination();
        }
        
        window.audioStarted = true;
        
        // Reproducir nota de prueba
        setTimeout(() => {
            try {
                window.synth.triggerAttackRelease("C4", "16n");
                console.log("Nota de prueba reproducida");
            } catch (e) {
                console.error("Error reproduciendo nota de prueba:", e);
            }
        }, 500);
    } catch (error) {
        console.error("Error inicializando Tone.js:", error);
    }
}

// Función para crear teclados simples
function createSimpleKeyboards() {
    console.log("Creando teclados simples...");
    
    // Limpiar los contenedores
    if (octave4Container) octave4Container.innerHTML = '';
    if (octave5Container) octave5Container.innerHTML = '';
    
    createOctaveKeys(octave4Container, 4);
    createOctaveKeys(octave5Container, 5);
}

// Crear teclado
function createKeyboard(container, octave) {
    if (!container) return;
    
    // Definir el ancho de la tecla blanca
    const WHITE_KEY_WIDTH = 38; // Actualizado a 38px
    const BLACK_KEY_WIDTH = 24; // Actualizado a 24px
    
    // Crear las teclas blancas primero
    const whitePianoKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    
    whitePianoKeys.forEach((note, index) => {
        const noteWithOctave = `${note}${octave}`;
        
        const whiteKey = document.createElement('div');
        whiteKey.className = 'piano-key white-key';
        whiteKey.setAttribute('data-note', noteWithOctave);
        whiteKey.style.left = `${index * WHITE_KEY_WIDTH}px`;
        
        const noteLabel = document.createElement('div');
        noteLabel.className = 'note-label';
        noteLabel.textContent = noteWithOctave;
        
        whiteKey.appendChild(noteLabel);
        
        // Añadir eventos de ratón
        whiteKey.addEventListener('mousedown', function(e) {
            e.preventDefault();
            
            // Si el audio no está iniciado, iniciarlo primero
            if (!window.audioStarted) {
                startAudio().then(() => {
                    playNote(noteWithOctave);
                    this.classList.add('active');
                }).catch(error => {
                    console.error("Error al iniciar audio desde tecla:", error);
                });
            } else {
                playNote(noteWithOctave);
                this.classList.add('active');
            }
        });
        
        // Eventos táctiles
        whiteKey.addEventListener('touchstart', function(e) {
            e.preventDefault();
            
            if (!window.audioStarted) {
                startAudio().then(() => {
                    playNote(noteWithOctave);
                    this.classList.add('active');
                }).catch(error => {
                    console.error("Error al iniciar audio desde tecla táctil:", error);
                });
            } else {
                playNote(noteWithOctave);
                this.classList.add('active');
            }
        }, { passive: false });
        
        // Eventos para detener la nota
        const stopNoteHandler = function() {
            stopNote(noteWithOctave);
            whiteKey.classList.remove('active');
        };
        
        document.addEventListener('mouseup', stopNoteHandler);
        document.addEventListener('touchend', stopNoteHandler);
        
        container.appendChild(whiteKey);
    });
    
    // Configurar el contenedor
    container.style.width = `${whitePianoKeys.length * WHITE_KEY_WIDTH}px`;
    container.style.height = '130px'; // Actualizado a 130px
    
    // Crear las teclas negras
    const blackKeyPositions = [0, 1, 3, 4, 5];
    
    blackKeyPositions.forEach((position) => {
        const whiteNote = whitePianoKeys[position];
        let blackNote;
        
        switch(whiteNote) {
            case 'C': blackNote = 'C#'; break;
            case 'D': blackNote = 'D#'; break;
            case 'F': blackNote = 'F#'; break;
            case 'G': blackNote = 'G#'; break;
            case 'A': blackNote = 'A#'; break;
            default: return;
        }
        
        const blackNoteWithOctave = `${blackNote}${octave}`;
        
        const blackKey = document.createElement('div');
        blackKey.className = 'piano-key black-key';
        blackKey.setAttribute('data-note', blackNoteWithOctave);
        blackKey.style.left = `${position * WHITE_KEY_WIDTH + (WHITE_KEY_WIDTH - BLACK_KEY_WIDTH) / 2}px`;
        
        const noteLabel = document.createElement('div');
        noteLabel.className = 'note-label';
        noteLabel.textContent = blackNoteWithOctave;
        
        blackKey.appendChild(noteLabel);
        
        // Añadir eventos de ratón
        blackKey.addEventListener('mousedown', function(e) {
            e.preventDefault();
            
            if (!window.audioStarted) {
                startAudio().then(() => {
                    playNote(blackNoteWithOctave);
                    this.classList.add('active');
                }).catch(error => {
                    console.error("Error al iniciar audio desde tecla negra:", error);
                });
            } else {
                playNote(blackNoteWithOctave);
                this.classList.add('active');
            }
        });
        
        // Eventos táctiles
        blackKey.addEventListener('touchstart', function(e) {
            e.preventDefault();
            
            if (!window.audioStarted) {
                startAudio().then(() => {
                    playNote(blackNoteWithOctave);
                    this.classList.add('active');
                }).catch(error => {
                    console.error("Error al iniciar audio desde tecla negra táctil:", error);
                });
            } else {
                playNote(blackNoteWithOctave);
                this.classList.add('active');
            }
        }, { passive: false });
        
        // Eventos para detener la nota
        const stopNoteHandler = function() {
            stopNote(blackNoteWithOctave);
            blackKey.classList.remove('active');
        };
        
        document.addEventListener('mouseup', stopNoteHandler);
        document.addEventListener('touchend', stopNoteHandler);
        
        container.appendChild(blackKey);
    });
}

// Manejar clic en tecla
function handleKeyClick(e) {
    e.preventDefault(); // Evitar comportamiento por defecto
    
    const note = this.getAttribute('data-note');
    console.log(`Clic en tecla: ${note}`);
    
    // Inicializar audio si es necesario
    initializeAudioIfNeeded().then(() => {
        // Tocar la nota
        playNote(note);
        
        // Agregar clase activa
        this.classList.add('active');
        
        // Detectar cuando se suelta el mouse para detener la nota
        const handleMouseUp = () => {
            stopNote(note);
            this.classList.remove('active');
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchend', handleMouseUp);
        };
        
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchend', handleMouseUp);
    });
}

// Inicializar audio si es necesario
async function initializeAudioIfNeeded() {
    if (isAudioStarted) return Promise.resolve();
    
    console.log("Inicializando audio...");
    
    try {
        // Iniciar el contexto de audio de Tone.js
        await Tone.start();
        console.log("Contexto de audio iniciado:", Tone.context.state);
        
        // Si el contexto está suspendido, intentar reanudarlo
        if (Tone.context.state !== "running") {
            console.log("Intentando reanudar contexto...");
            await Tone.context.resume();
            console.log("Contexto reanudado:", Tone.context.state);
        }
        
        // Crear un sintetizador básico
        synth = new Tone.PolySynth().toDestination();
        console.log("Sintetizador creado");
        
        isAudioStarted = true;
        return Promise.resolve();
    } catch (error) {
        console.error("Error al inicializar audio:", error);
        return Promise.reject(error);
    }
}

// Reproducir una nota
function playNote(note) {
    if (!window.audioStarted) {
        initializeTone();
    }
    
    if (!window.synth) {
        console.error("Sintetizador no inicializado");
        return;
    }
    
    if (!window.activeNotes) {
        window.activeNotes = {};
    }
    
    if (window.activeNotes[note]) {
        // La nota ya está activa
        return;
    }
    
    // Reproducir la nota
    try {
        window.synth.triggerAttack(note);
        window.activeNotes[note] = true;
        
        // Actualizar el estado visual de la tecla
        updateKeyState(note, true);
        
        console.log(`Nota reproducida: ${note}`);
    } catch (error) {
        console.error(`Error al reproducir la nota ${note}:`, error);
    }
}

// Detener una nota
function stopNote(note) {
    if (!window.synth || !window.activeNotes || !window.activeNotes[note]) {
        return;
    }
    
    try {
        window.synth.triggerRelease(note);
        delete window.activeNotes[note];
        
        // Actualizar el estado visual de la tecla
        updateKeyState(note, false);
        
        console.log(`Nota detenida: ${note}`);
    } catch (error) {
        console.error(`Error al detener la nota ${note}:`, error);
    }
}

// Actualizar el estado visual de una tecla
function updateKeyState(note, isActive) {
    const keyElement = document.querySelector(`.piano-key[data-note="${note}"]`);
    if (keyElement) {
        if (isActive) {
            keyElement.classList.add('active');
        } else {
            keyElement.classList.remove('active');
        }
    }
}

// Configurar la interfaz
function setupUI() {
    // Crear los teclados
    createKeyboards();
    
    // Configurar eventos de teclado para teclas físicas
    setupKeyboardEvents();
    
    // Configurar controles de sonido
    setupSoundControls();
    
    // Configurar controles de escala
    setupScaleControls();
    
    // Configurar controles de octava
    setupOctaveControls();
    
    // Configurar controles del sintetizador (ADSR, etc.)
    setupSynthControls();
    
    // Configurar superficie de control
    setupControlSurface();
    
    // Configurar selectores de tipo de sintetizador
    setupSynthTypeSelectors();
    
    // Configurar controles de reverb
    setupReverbControls();
    
    console.log("Interfaz de usuario configurada");
}

// Actualizar el mapeo de teclas según la octava base
function updateKeyboardMap(baseOctave) {
    keyboardMap = {
        // Primera Octava
        'z': `C${baseOctave}`,
        's': `C#${baseOctave}`,
        'x': `D${baseOctave}`,
        'd': `D#${baseOctave}`,
        'c': `E${baseOctave}`,
        'v': `F${baseOctave}`,
        'g': `F#${baseOctave}`,
        'b': `G${baseOctave}`,
        'h': `G#${baseOctave}`,
        'n': `A${baseOctave}`,
        'j': `A#${baseOctave}`,
        'm': `B${baseOctave}`,
        
        // Segunda Octava
        'q': `C${baseOctave + 1}`,
        '2': `C#${baseOctave + 1}`,
        'w': `D${baseOctave + 1}`,
        '3': `D#${baseOctave + 1}`,
        'e': `E${baseOctave + 1}`,
        'r': `F${baseOctave + 1}`,
        '5': `F#${baseOctave + 1}`,
        't': `G${baseOctave + 1}`,
        '6': `G#${baseOctave + 1}`,
        'y': `A${baseOctave + 1}`,
        '7': `A#${baseOctave + 1}`,
        'u': `B${baseOctave + 1}`
    };
    
    // Actualizar el mapeo inverso
    noteToKeyMap = {};
    for (const [key, note] of Object.entries(keyboardMap)) {
        noteToKeyMap[note] = key;
    }
}

// Actualizar el display de octavas
function updateOctaveDisplay() {
    if (currentOctaveDisplay) {
        currentOctaveDisplay.textContent = `${currentOctaveBase}-${currentOctaveBase + 1}`;
    }
    
    document.querySelectorAll('.octave-number').forEach((element, index) => {
        if (index === 0) {
            element.textContent = currentOctaveBase;
        } else {
            element.textContent = currentOctaveBase + 1;
        }
    });
}

// Configurar controles para cambiar el sonido
function setupSoundControls() {
    document.querySelectorAll('.sound-button').forEach(button => {
        button.addEventListener('click', () => {
            const soundIndex = parseInt(button.getAttribute('data-sound'));
            changeSound(soundIndex);
        });
    });
}

// Cambiar el tipo de sonido
function changeSound(soundIndex) {
    activeSound = soundIndex;
    
    // Actualizar botones activos
    document.querySelectorAll('.sound-button').forEach((button, index) => {
        if (parseInt(button.getAttribute('data-sound')) === soundIndex) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // Actualizar el texto de sonido actual
    const soundTypes = ['Sine', 'Square', 'Sawtooth', 'Triangle', 'Pulse'];
    if (currentSoundElement) {
        currentSoundElement.textContent = soundTypes[soundIndex];
    }
    
    // Actualizar el tipo de oscilador en Tone.js
    let oscType;
    switch (soundIndex) {
        case 0: oscType = 'sine'; break;
        case 1: oscType = 'square'; break;
        case 2: oscType = 'sawtooth'; break;
        case 3: oscType = 'triangle'; break;
        case 4: oscType = 'pulse'; break;
        default: oscType = 'sine';
    }
    
    if (synth) {
        // Actualizar el tipo de oscilador para las nuevas notas
        synthConfig.oscillator.type = oscType;
        
        // Crear un nuevo sintetizador con el tipo de oscilador actualizado
        const newSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: {
                type: oscType
            },
            envelope: {
                attack: synthConfig.envelope.attack,
                decay: synthConfig.envelope.decay,
                sustain: synthConfig.envelope.sustain,
                release: synthConfig.envelope.release
            }
        });
        
        // Detener todas las notas activas
        Object.keys(activeNotes).forEach(note => {
            stopNote(note);
        });
        
        // Conectar el nuevo sintetizador a la cadena de efectos
        newSynth.connect(filter);
        
        // Reemplazar el sintetizador anterior
        synth.disconnect();
        synth = newSynth;
        
        console.log(`Tipo de oscilador cambiado a: ${oscType}`);
    }
}

// Configurar controles para cambiar la escala
function setupScaleControls() {
    if (rootNoteSelect) {
        rootNoteSelect.addEventListener('change', () => {
            currentRootNote = rootNoteSelect.value;
            updateScale();
        });
    }
    
    if (scaleTypeSelect) {
        scaleTypeSelect.addEventListener('change', () => {
            currentScaleType = scaleTypeSelect.value;
            updateScale();
        });
    }
}

// Actualizar la escala actual
function updateScale() {
    console.log(`Actualizando escala: ${currentRootNote} ${currentScaleType}`);
    
    // Generar las notas de la escala
    const scale = generateScale(currentRootNote, scalePatterns[currentScaleType]);
    highlightedNotes = scale;
    
    // Actualizar el texto de escala actual
    if (currentScaleElement) {
        currentScaleElement.textContent = `${currentRootNote} ${currentScaleType}`;
    }
    
    // Resaltar las teclas que están en la escala
    highlightScaleKeys();
}

// Generar una escala a partir de una nota raíz y un patrón
function generateScale(rootNote, pattern) {
    const rootIndex = allNotes.indexOf(rootNote);
    if (rootIndex === -1) return [];
    
    return pattern.map(interval => {
        const noteIndex = (rootIndex + interval) % 12;
        return allNotes[noteIndex];
    });
}

// Resaltar las teclas que están en la escala actual
function highlightScaleKeys() {
    const pianoKeys = document.querySelectorAll('.piano-key');
    
    pianoKeys.forEach(key => {
        const note = key.getAttribute('data-note');
        if (note) {
            const noteName = note.replace(/\d+$/, ''); // Eliminar número de octava
            
            if (highlightedNotes.includes(noteName) || currentScaleType === 'cromática') {
                key.classList.add('in-scale');
                key.classList.remove('not-in-scale');
            } else {
                key.classList.add('not-in-scale');
                key.classList.remove('in-scale');
            }
        }
    });
}

// Verificar si una nota está en la escala actual
function isNoteInScale(noteWithOctave) {
    if (currentScaleType === 'cromática') return true;
    
    // Extraer solo el nombre de la nota (sin la octava)
    const noteName = noteWithOctave.replace(/\d+/g, '');
    return highlightedNotes.includes(noteName);
}

// Configurar controles de octava
function setupOctaveControls() {
    const octaveDownBtn = document.getElementById('octave-down');
    const octaveUpBtn = document.getElementById('octave-up');
    
    if (octaveDownBtn) {
        octaveDownBtn.addEventListener('click', () => {
            if (currentOctaveBase > OCTAVE_MIN) {
                currentOctaveBase--;
                createKeyboards();
            }
        });
    }
    
    if (octaveUpBtn) {
        octaveUpBtn.addEventListener('click', () => {
            if (currentOctaveBase < OCTAVE_MAX - 1) {
                currentOctaveBase++;
                createKeyboards();
            }
        });
    }
}

// Configurar los controles del sintetizador (ADSR, filters, etc.)
function setupSynthControls() {
    // Control de Attack
    setupRangeControl('control-attack', val => {
        synthConfig.envelope.attack = val;
        updateEnvelope();
    });
    
    // Control de Decay
    setupRangeControl('control-decay', val => {
        synthConfig.envelope.decay = val;
        updateEnvelope();
    });
    
    // Control de Sustain
    setupRangeControl('control-sustain', val => {
        synthConfig.envelope.sustain = val;
        updateEnvelope();
    });
    
    // Control de Release
    setupRangeControl('control-release', val => {
        synthConfig.envelope.release = val;
        updateEnvelope();
    });
    
    // Control de Filter Cutoff
    setupRangeControl('control-filter-cutoff', val => {
        // Usar nuestra propia función de mapeo logarítmico
        const frequency = mapToFrequencyRange(val);
        updateFilterFrequency(frequency);
    });
    
    // Control de Filter Resonance (Q)
    setupRangeControl('control-filter-resonance', val => {
        filter.Q.value = val * 10;
    });
    
    // Control de Bit Depth
    setupRangeControl('control-bit-depth', val => {
        const bits = Math.floor(val);
        bitCrusher.bits = bits;
    });
    
    // Control de Pulse Width (solo relevante para el oscilador 'pulse')
    setupRangeControl('control-pulse-width', val => {
        if (synthConfig.oscillator.type === 'pulse' && synth) {
            // Recrear el sintetizador con el nuevo ancho de pulso
            const newSynth = new Tone.PolySynth(Tone.Synth, {
                oscillator: {
                    type: 'pulse',
                    width: val
                },
                envelope: {
                    attack: synthConfig.envelope.attack,
                    decay: synthConfig.envelope.decay,
                    sustain: synthConfig.envelope.sustain,
                    release: synthConfig.envelope.release
                }
            });
            
            newSynth.connect(filter);
            synth.disconnect();
            synth = newSynth;
        }
    });
    
    // Control de Osc Level
    setupRangeControl('track-osc-level', val => {
        masterVolume.volume.value = Tone.gainToDb(val);
    });
    
    // Control de Delay Mix
    setupRangeControl('control-delay-mix', val => {
        delay.wet.value = val;
    });
}

// Actualizar el envelope en el sintetizador
function updateEnvelope() {
    if (!synth) return;
    
    // Para actualizar el envelope, necesitamos crear un nuevo sintetizador con los valores actualizados
    const newSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
            type: synthConfig.oscillator.type
        },
        envelope: {
            attack: synthConfig.envelope.attack,
            decay: synthConfig.envelope.decay,
            sustain: synthConfig.envelope.sustain,
            release: synthConfig.envelope.release
        }
    });
    
    // Detener todas las notas activas
    Object.keys(activeNotes).forEach(note => {
        stopNote(note);
    });
    
    // Conectar el nuevo sintetizador a la cadena de efectos
    newSynth.connect(filter);
    
    // Reemplazar el sintetizador anterior
    synth.disconnect();
    synth = newSynth;
}

// Función auxiliar para configurar controles de rango
function setupRangeControl(id, callback) {
    const control = document.getElementById(id);
    if (control) {
        // Establecer el valor inicial
        callback(parseFloat(control.value));
        
        // Añadir el evento de cambio
        control.addEventListener('input', () => {
            const value = parseFloat(control.value);
            callback(value);
        });
    }
}

// Configurar la superficie de control (pitch ribbon y XY pad)
function setupControlSurface() {
    console.log("Configurando superficie de control...");
    
    try {
        // Configurar Pitch Ribbon
        const ribbonTrack = document.querySelector('.ribbon-track');
        const ribbonHandle = document.querySelector('.ribbon-handle');
        
        if (ribbonTrack && ribbonHandle) {
            let isDragging = false;
            let detune = 0;
            
            // Función para actualizar la posición del mango y el detune
            const updateRibbonPosition = (e) => {
                if (!isDragging) return;
                
                const rect = ribbonTrack.getBoundingClientRect();
                const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
                
                // Calcular posición relativa (0 a 1)
                let position = (clientX - rect.left) / rect.width;
                position = Math.max(0, Math.min(1, position));
                
                // Actualizar posición visual
                ribbonHandle.style.left = `${position * 100}%`;
                
                // Calcular el detune (-200 a +200 cents)
                detune = (position - 0.5) * 400;
                updateDetune(detune);
            };
            
            // Eventos para el ribbon
            ribbonTrack.addEventListener('mousedown', (e) => {
                isDragging = true;
                updateRibbonPosition(e);
            });
            
            document.addEventListener('mousemove', updateRibbonPosition);
            
            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    // Resetear a posición central y detune a 0
                    ribbonHandle.style.left = '50%';
                    updateDetune(0);
                }
            });
            
            // Eventos táctiles
            ribbonTrack.addEventListener('touchstart', (e) => {
                isDragging = true;
                updateRibbonPosition(e);
            });
            
            document.addEventListener('touchmove', updateRibbonPosition);
            
            document.addEventListener('touchend', () => {
                if (isDragging) {
                    isDragging = false;
                    // Resetear a posición central y detune a 0
                    ribbonHandle.style.left = '50%';
                    updateDetune(0);
                }
            });
            
            console.log("Pitch Ribbon configurado");
        } else {
            console.warn("No se encontraron elementos del Pitch Ribbon");
        }
        
        // Configurar XY Pad
        const xyPad = document.querySelector('.xy-pad');
        const xyHandle = document.querySelector('.xy-handle');
        
        if (xyPad && xyHandle) {
            let isDragging = false;
            
            // Función para actualizar la posición del mango y los parámetros
            const updateXYPosition = (e) => {
                if (!isDragging) return;
                
                const rect = xyPad.getBoundingClientRect();
                const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
                const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
                
                // Calcular posición relativa (0 a 1)
                let xPosition = (clientX - rect.left) / rect.width;
                let yPosition = (clientY - rect.top) / rect.height;
                
                xPosition = Math.max(0, Math.min(1, xPosition));
                yPosition = Math.max(0, Math.min(1, yPosition));
                
                // Actualizar posición visual
                xyHandle.style.left = `${xPosition * 100}%`;
                xyHandle.style.top = `${yPosition * 100}%`;
                
                // Mapear a parámetros de filtro
                // X: Frecuencia de corte (50Hz a 10kHz, escala logarítmica)
                const frequency = mapToFrequencyRange(xPosition);
                
                // Y: Resonancia (1 a 20, invertido para que arriba sea más resonancia)
                const resonance = 1 + (1 - yPosition) * 19;
                
                // Actualizar filtro
                updateFilterParams(frequency, resonance);
            };
            
            // Eventos para el XY Pad
            xyPad.addEventListener('mousedown', (e) => {
                isDragging = true;
                updateXYPosition(e);
            });
            
            document.addEventListener('mousemove', updateXYPosition);
            
            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
            
            // Eventos táctiles
            xyPad.addEventListener('touchstart', (e) => {
                isDragging = true;
                updateXYPosition(e);
            });
            
            document.addEventListener('touchmove', updateXYPosition);
            
            document.addEventListener('touchend', () => {
                isDragging = false;
            });
            
            // Posición inicial (centro)
            xyHandle.style.left = '50%';
            xyHandle.style.top = '50%';
            
            console.log("XY Pad configurado");
        } else {
            console.warn("No se encontraron elementos del XY Pad");
        }
        
    } catch (error) {
        console.error("Error al configurar superficie de control:", error);
    }
}

// Configurar eventos de teclado
function setupKeyboardEvents() {
    // Eventos de teclado para tocar notas
    window.addEventListener('keydown', (e) => {
        if (!isAudioStarted || e.repeat) return;
        
        const key = e.key.toLowerCase();
        
        if (keyboardMap[key]) {
            const note = keyboardMap[key];
            
            // Verificar si la nota está en la escala actual
            if (isNoteInScale(note)) {
                if (!activeKeys[key]) {
                    playNote(note);
                    activeKeys[key] = true;
                    updateKeyVisuals();
                }
            }
        }
    });
    
    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        
        if (keyboardMap[key]) {
            const note = keyboardMap[key];
            stopNote(note);
            delete activeKeys[key];
            updateKeyVisuals();
        }
    });
}

// Actualizar la visualización de las teclas activas
function updateKeyVisuals() {
    // Quitar la clase 'active' de todas las teclas
    document.querySelectorAll('.piano-key').forEach(key => {
        key.classList.remove('active');
    });
    
    // Añadir la clase 'active' a las teclas presionadas
    for (const key in activeKeys) {
        if (!activeKeys[key]) continue;
        
        const note = keyboardMap[key];
        const keyElement = document.querySelector(`.piano-key[data-note="${note}"]`);
        
        if (keyElement) {
            keyElement.classList.add('active');
        }
    }
}

// Actualizar la frecuencia del filtro usando un método compatible con Tone.js
function updateFilterFrequency(frequency) {
    if (!filter) return;
    
    try {
        filter.frequency.value = frequency;
        console.log(`Frecuencia de filtro actualizada a ${frequency}Hz`);
    } catch (error) {
        console.error("Error al actualizar frecuencia de filtro:", error);
    }
}

// Función para calcular la frecuencia de una nota por su nombre
function noteFrequency(noteName) {
    console.log(`Calculando frecuencia para nota: ${noteName}`);
    try {
        // Extraer el nombre de la nota y la octava
        const regex = /^([A-G]#?)(\d+)?$/;
        const match = noteName.match(regex);
        
        if (!match) {
            console.error(`Formato de nota inválido: ${noteName}`);
            return null;
        }
        
        const note = match[1];
        const octave = match[2] ? parseInt(match[2]) : 4; // Octava por defecto: 4
        
        // Índice de la nota en la escala cromática (A4 = 440 Hz)
        const noteIndices = {
            'C': 0, 'C#': 1, 
            'D': 2, 'D#': 3, 
            'E': 4, 
            'F': 5, 'F#': 6, 
            'G': 7, 'G#': 8, 
            'A': 9, 'A#': 10, 
            'B': 11
        };
        
        if (noteIndices[note] === undefined) {
            console.error(`Nota desconocida: ${note}`);
            return null;
        }
        
        // Calcular semitonos de distancia desde A4 (La de la octava 4, 440 Hz)
        const A4Index = 9 + (4 * 12); // A4
        const noteIndex = noteIndices[note] + (octave * 12);
        const semitones = noteIndex - A4Index;
        
        // Calcular la frecuencia: f = 440 * 2^(n/12)
        const frequency = 440 * Math.pow(2, semitones / 12);
        
        console.log(`Frecuencia calculada para ${noteName}: ${frequency.toFixed(2)} Hz`);
        return frequency;
    } catch (error) {
        console.error(`Error al calcular frecuencia para ${noteName}:`, error);
        return null;
    }
}

// Función para mapear un valor normalizado (0-1) a un rango de frecuencias (escala logarítmica)
function mapToFrequencyRange(normalizedValue, minFreq = 20, maxFreq = 20000) {
    console.log(`Mapeando valor ${normalizedValue} a rango de frecuencia`);
    try {
        // Usamos una escala logarítmica para que suene más natural
        // minFreq = 20Hz, maxFreq = 20kHz
        const minLog = Math.log(minFreq);
        const maxLog = Math.log(maxFreq);
        const scale = maxLog - minLog;
        
        // Calcular la frecuencia
        const logFreq = minLog + (normalizedValue * scale);
        const frequency = Math.exp(logFreq);
        
        console.log(`Frecuencia mapeada: ${frequency.toFixed(2)}Hz`);
        return frequency;
    } catch (error) {
        console.error("Error en mapeo de frecuencia:", error);
        return 1000; // valor por defecto
    }
}

// Función para actualizar los parámetros del filtro
function updateFilterParams(frequency, resonance) {
    console.log(`Actualizando parámetros del filtro: freq=${frequency.toFixed(2)}Hz, Q=${resonance.toFixed(2)}`);
    try {
        if (!filter) {
            console.warn("Filtro no inicializado");
            return;
        }
        
        // Actualizar valor del filtro
        filter.frequency.value = frequency;
        filter.Q.value = resonance;
        
        // Actualizar controles visuales
        updateControlValue('filter-cutoff', frequency / 20000); // normalizado a 0-1
        updateControlValue('filter-resonance', resonance / 20); // normalizado a 0-1
        
        console.log("Parámetros del filtro actualizados");
    } catch (error) {
        console.error("Error al actualizar filtro:", error);
    }
}

// Función para actualizar un control visual
function updateControlValue(controlId, normalizedValue) {
    try {
        const control = document.getElementById(`control-${controlId}`);
        if (control) {
            control.value = normalizedValue;
            
            // Actualizar etiqueta si existe
            const label = document.getElementById(`value-${controlId}`);
            if (label) {
                if (controlId === 'filter-cutoff') {
                    label.textContent = `${(normalizedValue * 20000).toFixed(0)}Hz`;
                } else if (controlId === 'filter-resonance') {
                    label.textContent = (normalizedValue * 20).toFixed(1);
                } else {
                    label.textContent = normalizedValue.toFixed(2);
                }
            }
        }
    } catch (error) {
        console.error(`Error al actualizar control ${controlId}:`, error);
    }
}

// Función para actualizar el detune (pitch bend)
function updateDetune(detuneCents) {
    console.log(`Actualizando detune: ${detuneCents} cents`);
    try {
        // Si no hay notas activas, no hay nada que hacer
        if (Object.keys(activeNotes).length === 0) {
            return;
        }
        
        // Calcular el factor de detune
        // 100 cents = un semitono, factor de 2^(1/12)
        const detuneFactor = Math.pow(2, detuneCents / 1200);
        
        if (!synth) {
            console.warn("Sintetizador no disponible para aplicar detune");
            return;
        }
        
        // Con Tone.js, podemos aplicar el detune directamente al sintetizador
        // para todas las notas activas
        Object.keys(activeNotes).forEach(noteId => {
            if (synth.get(noteId)) {
                // Detune está en cents, lo aplicamos a todas las voces activas
                synth.triggerAttack(noteId, Tone.now(), 1.0, detuneCents);
                console.log(`Aplicado detune de ${detuneCents} cents a nota ${noteId}`);
            }
        });
    } catch (error) {
        console.error("Error al actualizar detune:", error);
    }
}

// Función para iniciar el audio
async function startAudio() {
    console.log("Iniciando audio...");
    
    try {
        // Iniciar contexto de audio de Tone.js
        await Tone.start();
        console.log("Contexto de audio iniciado, estado: ", Tone.context.state);
        
        if (Tone.context.state !== "running") {
            console.log("Intentando reanudar el contexto de audio...");
            await Tone.context.resume();
        }
        
        // Configurar componentes de sintetizador
        setupSynthComponents();
        
        // Configurar interfaz de usuario
        setupUI();
        
        // Marcar audio como iniciado
        window.audioStarted = true;
        console.log("Audio iniciado correctamente");
        
        // Tocar una nota de prueba después de un breve retraso
        setTimeout(() => {
            try {
                playNote("C4");
                setTimeout(() => stopNote("C4"), 300);
            } catch (e) {
                console.error("Error al tocar nota de prueba:", e);
            }
        }, 500);
        
        return Promise.resolve();
    } catch (error) {
        console.error("Error al iniciar el audio:", error);
        return Promise.reject(error);
    }
}

// Configurar componentes del sintetizador
function setupSynthComponents() {
    console.log("Configurando componentes de audio...");
    
    // Usamos el sintetizador ya creado o creamos uno si aún no existe
    if (!window.synth) {
        window.synth = new Tone.PolySynth(Tone.FMSynth).toDestination();
    }
    
    console.log("Componentes de audio configurados");
}

// Crear teclados para las octavas 4 y 5
function createKeyboards() {
    console.log("Creando teclados para octavas...");
    
    // Limpiar los contenedores
    if (octave4Container) octave4Container.innerHTML = '';
    if (octave5Container) octave5Container.innerHTML = '';
    
    // Crear teclados para las octavas seleccionadas
    createKeyboard(octave4Container, currentOctaveBase);
    createKeyboard(octave5Container, currentOctaveBase + 1);
    
    // Actualizar el display de octava
    updateOctaveDisplay();
    
    // Actualizar el mapeo de teclado
    updateKeyboardMap(currentOctaveBase);
    
    console.log(`Teclados creados para octavas ${currentOctaveBase} y ${currentOctaveBase + 1}`);
}