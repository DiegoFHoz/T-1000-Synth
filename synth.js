// Elementos del DOM
const startButton = document.getElementById('start-audio');
const controlsContainer = document.getElementById('controls');
const keyboardContainer = document.getElementById('keyboard-container');
const keyboardGuide = document.getElementById('keyboard-guide');
const currentSoundElement = document.getElementById('current-sound');
const currentScaleElement = document.getElementById('current-scale');
const rootNoteSelect = document.getElementById('root-note');
const scaleTypeSelect = document.getElementById('scale-type');
const octave4Container = document.getElementById('octave-4');
const octave5Container = document.getElementById('octave-5');

// Estado de la aplicación
let isAudioStarted = false;
let activeSound = 0;
let activeKeys = {};
let currentRootNote = 'C';
let currentScaleType = 'cromática';
let highlightedNotes = [];

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

// Definir el mapeo de teclas a notas
const keyboardMap = {
    // Primera Octava (C4 a B4)
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
    
    // Segunda Octava (C5 a B5)
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
const noteToKeyMap = {};
for (const [key, note] of Object.entries(keyboardMap)) {
    noteToKeyMap[note] = key;
}

// Inicializar sintetizadores con Tone.js
let synths = [];

function createSynths() {
    synths = [
        new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 1 }
        }).toDestination(),
        
        new Tone.AMSynth({
            harmonicity: 2,
            detune: 0,
            oscillator: { type: 'square' },
        }).toDestination(),
        
        new Tone.FMSynth({
            harmonicity: 3,
            modulationIndex: 10,
            oscillator: { type: 'sine' }
        }).toDestination(),
        
        new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 4,
            oscillator: { type: 'sine' }
        }).toDestination()
    ];
}

// Inicializar el audio
async function startAudio() {
    await Tone.start();
    createSynths();
    isAudioStarted = true;
    
    // Mostrar controles y teclado
    document.getElementById('start-container').classList.add('hidden');
    controlsContainer.classList.remove('hidden');
    keyboardContainer.classList.remove('hidden');
    keyboardGuide.classList.remove('hidden');
    
    // Inicializar el teclado
    createKeyboards();
    updateScale();
}

// Función para generar una escala a partir de una nota raíz y un patrón
function generateScale(rootNote, pattern) {
    const rootIndex = allNotes.indexOf(rootNote);
    if (rootIndex === -1) return [];
    
    return pattern.map(interval => {
        const noteIndex = (rootIndex + interval) % 12;
        return allNotes[noteIndex];
    });
}

// Verificar si una nota está en la escala actual
function isNoteInScale(noteWithOctave) {
    if (currentScaleType === 'cromática') return true;
    
    // Extraer el nombre de la nota sin la octava
    const noteName = noteWithOctave.replace(/[0-9]/g, '');
    return highlightedNotes.includes(noteName);
}

// Actualizar las notas destacadas cuando cambia la escala o la nota raíz
function updateScale() {
    const scale = generateScale(currentRootNote, scalePatterns[currentScaleType]);
    highlightedNotes = scale;
    
    // Actualizar el texto que muestra la escala actual
    currentScaleElement.textContent = `${currentRootNote} ${currentScaleType}`;
    
    // Actualizar las clases de las teclas para mostrar cuáles están en la escala
    const allKeyElements = document.querySelectorAll('.piano-key');
    allKeyElements.forEach(keyElement => {
        const note = keyElement.getAttribute('data-note');
        const inScale = isNoteInScale(note);
        
        keyElement.classList.remove('in-scale', 'not-in-scale');
        keyElement.classList.add(inScale ? 'in-scale' : 'not-in-scale');
    });
}

// Función para crear los teclados
function createKeyboards() {
    const octaves = [4, 5];
    const whitePianoKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const whiteKeyPositions = [0, 2, 4, 5, 7, 9, 11]; // Posiciones en la escala cromática
    
    octaves.forEach(octave => {
        const container = document.getElementById(`octave-${octave}`);
        container.innerHTML = '';
        
        // Crear las teclas blancas primero
        whitePianoKeys.forEach((note, index) => {
            const noteWithOctave = `${note}${octave}`;
            const keyChar = noteToKeyMap[noteWithOctave];
            
            const whiteKey = document.createElement('div');
            whiteKey.className = 'piano-key white-key';
            whiteKey.setAttribute('data-note', noteWithOctave);
            whiteKey.setAttribute('data-key', keyChar || '');
            
            const keyLabel = document.createElement('div');
            keyLabel.className = 'key-label';
            keyLabel.textContent = keyChar ? keyChar.toUpperCase() : '';
            
            const noteLabel = document.createElement('div');
            noteLabel.className = 'note-label';
            noteLabel.textContent = noteWithOctave;
            
            whiteKey.appendChild(keyLabel);
            whiteKey.appendChild(noteLabel);
            whiteKey.addEventListener('mousedown', () => handlePianoKeyClick(noteWithOctave, keyChar));
            
            container.appendChild(whiteKey);
        });
        
        // Después añadir las teclas negras
        whitePianoKeys.forEach((note, index) => {
            // No hay tecla negra después de E y B
            if (note !== 'E' && note !== 'B') {
                const blackNoteIndex = (whiteKeyPositions[index] + 1) % 12;
                const blackNote = allNotes[blackNoteIndex];
                const blackNoteWithOctave = `${blackNote}${octave}`;
                const keyChar = noteToKeyMap[blackNoteWithOctave];
                
                const blackKey = document.createElement('div');
                blackKey.className = 'piano-key black-key';
                blackKey.setAttribute('data-note', blackNoteWithOctave);
                blackKey.setAttribute('data-key', keyChar || '');
                
                // Posicionar la tecla negra (un poco de matemáticas para el posicionamiento)
                blackKey.style.left = `${index * 48 + 32}px`;
                
                const keyLabel = document.createElement('div');
                keyLabel.className = 'key-label';
                keyLabel.textContent = keyChar ? keyChar.toUpperCase() : '';
                
                const noteLabel = document.createElement('div');
                noteLabel.className = 'note-label';
                noteLabel.textContent = blackNoteWithOctave;
                
                blackKey.appendChild(keyLabel);
                blackKey.appendChild(noteLabel);
                blackKey.addEventListener('mousedown', () => handlePianoKeyClick(blackNoteWithOctave, keyChar));
                
                container.appendChild(blackKey);
            }
        });
    });
}

// Manejar el clic en una tecla del piano
function handlePianoKeyClick(note, keyChar) {
    if (!isAudioStarted) return;
    
    // Solo tocar si la nota está en la escala actual o es cromática
    if (isNoteInScale(note)) {
        synths[activeSound].triggerAttackRelease(note, '0.2');
        
        // Efecto visual temporal
        if (keyChar) {
            activeKeys[keyChar] = true;
            updateActiveKeys();
            
            setTimeout(() => {
                delete activeKeys[keyChar];
                updateActiveKeys();
            }, 200);
        }
    }
}

// Actualizar las teclas activas visualmente
function updateActiveKeys() {
    const allKeyElements = document.querySelectorAll('.piano-key');
    
    allKeyElements.forEach(keyElement => {
        const keyChar = keyElement.getAttribute('data-key');
        keyElement.classList.remove('active');
        
        if (keyChar && activeKeys[keyChar]) {
            keyElement.classList.add('active');
        }
    });
}

// Manejar el presionar teclas
function handleKeyDown(e) {
    if (!isAudioStarted) return;
    
    const key = e.key.toLowerCase();
    
    // Si la tecla está en nuestro mapa y no está ya activada
    if (keyboardMap[key] && !activeKeys[key]) {
        const note = keyboardMap[key];
        
        // Solo tocar si la nota está en la escala actual o es cromática
        if (isNoteInScale(note)) {
            synths[activeSound].triggerAttack(note);
            activeKeys[key] = true;
            updateActiveKeys();
        }
    }
}

// Manejar el soltar teclas
function handleKeyUp(e) {
    if (!isAudioStarted) return;
    
    const key = e.key.toLowerCase();
    
    if (keyboardMap[key]) {
        // Soltamos la nota
        synths[activeSound].triggerRelease();
        
        // Actualizamos el estado para mostrar la tecla como inactiva
        delete activeKeys[key];
        updateActiveKeys();
    }
}

// Cambiar el tipo de sonido
function changeSound(soundIndex) {
    activeSound = soundIndex;
    const soundNames = ['Sine', 'AM Synth', 'FM Synth', 'Membrane'];
    currentSoundElement.textContent = soundNames[soundIndex];
    
    // Actualizar los botones activos
    document.querySelectorAll('.sound-button').forEach((button, index) => {
        button.classList.toggle('active', index === soundIndex);
    });
}

// Event listeners
startButton.addEventListener('click', startAudio);

// Listeners para cambios de escala y nota raíz
rootNoteSelect.addEventListener('change', e => {
    currentRootNote = e.target.value;
    updateScale();
});

scaleTypeSelect.addEventListener('change', e => {
    currentScaleType = e.target.value;
    updateScale();
});

// Event listeners para teclado físico
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

// Event listeners para botones de sonido
document.querySelectorAll('.sound-button').forEach(button => {
    button.addEventListener('click', () => {
        changeSound(parseInt(button.getAttribute('data-sound')));
    });
});