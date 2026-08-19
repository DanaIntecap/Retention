let allData = [];
let filteredData = [];
let currentSentence = null;
let recognition = null;

// Elementos del DOM
const filterNivel = document.getElementById('filterNivel');
const filterSubnivel = document.getElementById('filterSubnivel');
const filterUnidad = document.getElementById('filterUnidad');
const filterRol = document.getElementById('filterRol'); 
const sentenceSelect = document.getElementById('sentenceSelect');
const feedbackBox = document.getElementById('feedbackBox');

// Forzar carga de voces 
window.speechSynthesis.onvoiceschanged = function() {
    window.speechSynthesis.getVoices();
};

// 1. Cargar JSON
fetch("sentences.json")
    .then(response => {
        if (!response.ok) throw new Error("No se pudo cargar sentences.json");
        return response.json();
    })
    .then(data => {
        allData = data;
        populateFilters();
        applyFilters();
    })
    .catch(error => {
        console.error("Error cargando data:", error);
        feedbackBox.innerHTML = "❌ Error cargando las oraciones. Revisa sentences.json";
    });

// 2. Filtros en Cascada
function populateFilters() {
    const niveles = [...new Set(allData.map(item => item.Level))].filter(Boolean).sort();
    niveles.forEach(n => filterNivel.innerHTML += `<option value="${n}">${n}</option>`);

    filterNivel.addEventListener('change', updateSubniveles);
    filterSubnivel.addEventListener('change', updateUnidades);
    filterUnidad.addEventListener('change', applyFilters);
    if(filterRol) filterRol.addEventListener('change', applyFilters); 
    sentenceSelect.addEventListener('change', selectSentence);
}

function updateSubniveles() {
    const nivelVal = filterNivel.value;
    filterSubnivel.innerHTML = '<option value="">Subniveles</option>';
    let subniveles = allData;
    if (nivelVal) subniveles = subniveles.filter(item => item.Level === nivelVal);
    
    [...new Set(subniveles.map(item => item.Sublevel))].filter(Boolean).sort()
        .forEach(s => filterSubnivel.innerHTML += `<option value="${s}">${s}</option>`);
    updateUnidades();
}

function updateUnidades() {
    const subnivelVal = filterSubnivel.value;
    filterUnidad.innerHTML = '<option value="">Unidades</option>';
    let unidades = allData;
    if (subnivelVal) unidades = unidades.filter(item => item.Sublevel === subnivelVal);
    
    [...new Set(unidades.map(item => item.Unit))].filter(Boolean).sort((a,b) => Number(a) - Number(b))
        .forEach(u => filterUnidad.innerHTML += `<option value="${u}">Unidad ${u}</option>`);
    applyFilters();
}

function applyFilters() {
    filteredData = allData.filter(item => {
        const matchNivel = !filterNivel.value || item.Level === filterNivel.value;
        const matchSubnivel = !filterSubnivel.value || item.Sublevel === filterSubnivel.value;
        const matchUnidad = !filterUnidad.value || String(item.Unit) === String(filterUnidad.value);
        
        // Se actualizó para leer "role" (o "Role" por si Excel lo pone en mayúscula)
        const itemRole = item.role || item.Role;
        const matchRol = !filterRol || !filterRol.value || itemRole === filterRol.value;
        
        return matchNivel && matchSubnivel && matchUnidad && matchRol;
    });

    sentenceSelect.innerHTML = '<option value="">Selecciona un audio...</option>';
    filteredData.forEach(item => {
        sentenceSelect.innerHTML += `<option value="${item.Title}">${item.Title}</option>`;
    });
    
    currentSentence = null;
    resetFeedback();
}

function selectSentence() {
    currentSentence = filteredData.find(item => item.Title === sentenceSelect.value);
    resetFeedback();
}

function resetFeedback() {
    feedbackBox.innerHTML = "🎧 Selecciona un audio y escúchalo primero...";
    feedbackBox.style.borderColor = "#b2bec3";
    feedbackBox.style.color = "#8395a7";
}

// 3. Audio (TTS)
function playAudio(speed) {
    if (!currentSentence) return alert("Selecciona un audio primero.");
    if (!currentSentence["Retention sentence"]) return alert("Error: La columna 'Retention sentence' está vacía en este registro.");

    window.speechSynthesis.cancel(); 
    
    const msg = new SpeechSynthesisUtterance(currentSentence["Retention sentence"]);
    
    const voices = window.speechSynthesis.getVoices();
    let engVoice = voices.find(v => v.lang.startsWith("en-US")) || voices.find(v => v.lang.startsWith("en"));
    if(engVoice) msg.voice = engVoice;
    
    msg.lang = "en-US";
    msg.rate = speed;
    
    window.speechSynthesis.speak(msg);
}

document.getElementById('btnPlayNormal').addEventListener('click', () => playAudio(1));
document.getElementById('btnPlaySlow').addEventListener('click', () => playAudio(0.85));

// 4. Reconocimiento de Voz
document.getElementById('btnSpeak').addEventListener('click', () => {
    if (!currentSentence) return alert("Selecciona un audio primero.");

    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechAPI) return alert("Tu navegador no soporta el reconocimiento de voz. Usa Google Chrome o Edge.");

    if (recognition) recognition.stop();

    recognition = new SpeechAPI();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    feedbackBox.innerHTML = "🎤 Escuchando... habla ahora.";
    feedbackBox.style.borderColor = "#f1c40f";
    feedbackBox.style.color = "#d35400";
    
    recognition.onresult = (event) => {
        const spoken = event.results[0][0].transcript;
        compare(spoken, currentSentence["Retention sentence"]);
    };

    recognition.onerror = (event) => {
        console.error("Error micrófono:", event.error);
        if(event.error === 'not-allowed') {
             feedbackBox.innerHTML = "❌ Permiso de micrófono denegado. Dale permiso al navegador.";
        } else {
             feedbackBox.innerHTML = "❌ No te escuché bien. Intenta de nuevo.";
        }
    };

    recognition.start();
});

function compare(spoken, expected) {
    if(!expected) return;
    
    const cleanSpoken = spoken.toLowerCase().replace(/[.,!?']/g, "").trim();
    const cleanExpected = expected.toLowerCase().replace(/[.,!?']/g, "").trim();

    if (cleanSpoken === cleanExpected) {
        feedbackBox.innerHTML = `✅ ¡Excelente!<br><span style="color:#2ecc71; font-weight: bold;">${expected}</span>`;
        feedbackBox.style.borderColor = "#2ecc71";
    } else {
        feedbackBox.innerHTML = `⚠️ Casi lo logras.<br>Dijiste: <em>${spoken}</em>`;
        feedbackBox.style.borderColor = "#e67e22";
    }
}

// 5. Mostrar Oración
document.getElementById('btnGiveUp').addEventListener('click', () => {
    if (!currentSentence) return;
    feedbackBox.innerHTML = `👀 <strong>${currentSentence["Retention sentence"]}</strong>`;
    feedbackBox.style.borderColor = "#3498db";
    feedbackBox.style.color = "#2c3e50";
});
