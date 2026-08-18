let allData = [];
let filteredData = [];
let currentSentence = null;
let recognition = null;

const filterNivel = document.getElementById('filterNivel');
const filterSubnivel = document.getElementById('filterSubnivel');
const filterUnidad = document.getElementById('filterUnidad');
const filterRol = document.getElementById('filterRol');
const sentenceSelect = document.getElementById('sentenceSelect');
const feedbackBox = document.getElementById('feedbackBox');

// 1. Cargar JSON (Actualizado a sentences.json)
fetch("sentences.json")
    .then(response => response.json())
    .then(data => {
        allData = data;
        populateFilters();
        applyFilters();
    })
    .catch(error => console.error("Error cargando data:", error));

// 2. Filtros en Cascada
function populateFilters() {
    const niveles = [...new Set(allData.map(item => item.Level))].filter(Boolean).sort();
    niveles.forEach(n => filterNivel.innerHTML += `<option value="${n}">${n}</option>`);

    filterNivel.addEventListener('change', updateSubniveles);
    filterSubnivel.addEventListener('change', updateUnidades);
    filterUnidad.addEventListener('change', applyFilters);
    filterRol.addEventListener('change', applyFilters); 
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
    
    [...new Set(unidades.map(item => item.Unit))].filter(Boolean).sort()
        .forEach(u => filterUnidad.innerHTML += `<option value="${u}">Unidad ${u}</option>`);
    applyFilters();
}

function applyFilters() {
    filteredData = allData.filter(item => {
        return (!filterNivel.value || item.Level === filterNivel.value) &&
               (!filterSubnivel.value || item.Sublevel === filterSubnivel.value) &&
               (!filterUnidad.value || String(item.Unit) === String(filterUnidad.value)) &&
               (!filterRol.value || item.Rol === filterRol.value);
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
    speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(currentSentence["Retention Sentence"]);
    msg.lang = "en-US";
    msg.rate = speed;
    speechSynthesis.speak(msg);
}

document.getElementById('btnPlayNormal').addEventListener('click', () => playAudio(1));
document.getElementById('btnPlaySlow').addEventListener('click', () => playAudio(0.85));

// 4. Reconocimiento de Voz
document.getElementById('btnSpeak').addEventListener('click', () => {
    if (!currentSentence) return alert("Selecciona un audio primero.");

    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechAPI) return alert("Navegador no compatible. Usa Chrome o Edge.");

    recognition = new SpeechAPI();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    feedbackBox.innerHTML = "🎤 Escuchando... habla ahora.";
    feedbackBox.style.borderColor = "#f1c40f";
    feedbackBox.style.color = "#d35400";
    
    recognition.onresult = (event) => {
        const spoken = event.results[0][0].transcript;
        compare(spoken, currentSentence["Retention Sentence"]);
    };

    recognition.onerror = () => {
        feedbackBox.innerHTML = "❌ No te escuché bien. Intenta de nuevo.";
    };

    recognition.start();
});

function compare(spoken, expected) {
    const cleanSpoken = spoken.toLowerCase().replace(/[.,!?]/g, "").trim();
    const cleanExpected = expected.toLowerCase().replace(/[.,!?]/g, "").trim();

    if (cleanSpoken === cleanExpected) {
        feedbackBox.innerHTML = `✅ ¡Excelente!<br><span style="color:#2ecc71;">${expected}</span>`;
        feedbackBox.style.borderColor = "#2ecc71";
    } else {
        feedbackBox.innerHTML = `⚠️ Casi lo logras.<br>Dijiste: <em>${spoken}</em>`;
        feedbackBox.style.borderColor = "#e67e22";
    }
}

// 5. Mostrar Oración
document.getElementById('btnGiveUp').addEventListener('click', () => {
    if (!currentSentence) return;
    feedbackBox.innerHTML = `👀 <strong>${currentSentence["Retention Sentence"]}</strong>`;
    feedbackBox.style.borderColor = "#3498db";
    feedbackBox.style.color = "#2c3e50";
});
