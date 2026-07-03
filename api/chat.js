const form = document.querySelector("#chat-form");
const input = document.querySelector("#user-input");
const chatBox = document.querySelector("#chat-box");
const sendBtn = document.querySelector("#send-btn");

// Elementos de la solución de doble video tag fijados
const avatarIdle = document.querySelector("#avatar-idle");
const avatarTalking = document.querySelector("#avatar-talking");
const chatTitle = document.querySelector(".chat-title");

let isTyping = false;

// ============================================
// INICIALIZACIÓN DE VIDEOS (Fuerza Autoplay Definitivo)
// ============================================
function initVideos() {
    if (!avatarIdle) return;
    
    avatarIdle.muted = true;
    
    // Intento 1: Reproducción automática inmediata
    avatarIdle.play().catch(err => {
        console.log("Autoplay bloqueado por el navegador. Esperando interacción del usuario...");
        
        // Intento 2: Bypass. En cuanto el usuario mueva el mouse o haga clic, el video arranca.
        const startVideoOnInteraction = () => {
            avatarIdle.play().then(() => {
                // Una vez que arranca con éxito, removemos los listeners para no saturar memoria
                document.removeEventListener("click", startVideoOnInteraction);
                document.removeEventListener("keydown", startVideoOnInteraction);
                document.removeEventListener("touchstart", startVideoOnInteraction);
            }).catch(e => console.error("Error crítico al reproducir:", e));
        };

        document.addEventListener("click", startVideoOnInteraction);
        document.addEventListener("keydown", startVideoOnInteraction);
        document.addEventListener("touchstart", startVideoOnInteraction); // Soporte móviles
    });
}

// Ejecutar carga del bucle estático inicial
initVideos();

// ============================================
// ANIMACIÓN TYPEWRITER PARA EL TÍTULO
// ============================================
function animateTitle() {
    if (!chatTitle) return;
    const text = chatTitle.getAttribute("data-text") || "Ask me anything!";
    chatTitle.textContent = ""; 
    
    let index = 0;
    const speed = 60; 

    function type() {
        if (index < text.length) {
            chatTitle.textContent += text[index];
            index++;
            setTimeout(type, speed);
        }
    }
    type();
}

animateTitle();

// ============================================
// DETECTAR/NORMALIZAR CLIMA O TEMPERATURA
// ============================================
function normalizeWeatherMessage(message) {
    const lower = message.toLowerCase();
    if (lower.includes("weather") || lower.includes("temperature")) {
        return "the weather";
    }
    if (lower.includes("clima") || lower.includes("temperatura")) {
        return "la temperatura";
    }
    return message;
}

// ============================================
// CONTROL DE TRANSMISIÓN DE VIDEOS (OPACIDAD)
// ============================================
function setAvatarState(talking) {
    if (talking) {
        avatarTalking.currentTime = 0;
        avatarTalking.play().catch(err => console.log("Auto-play mitigado:", err));
        
        avatarTalking.classList.add("active");
        avatarIdle.classList.remove("active");
    } else {
        avatarIdle.classList.add("active");
        avatarTalking.classList.remove("active");
        
        avatarIdle.play().catch(err => console.log("Error al reanudar Idle:", err));
        
        setTimeout(() => {
            if (!isTyping) avatarTalking.pause();
        }, 150);
    }
}

// ============================================
// MANEJO DE ENVÍO DE MENSAJES
// ============================================
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const rawMessage = input.value.trim();
    if (!rawMessage || isTyping) return;

    const processedMessage = normalizeWeatherMessage(rawMessage);

    addMessage("user", rawMessage);
    input.value = "";
    sendBtn.disabled = true;

    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: processedMessage }),
        });

        const data = await res.json();
        const botReply = data.text || "No tengo respuesta.";

        addBotMessageWithVoice(botReply);

    } catch (err) {
        console.error("Error al procesar la respuesta del servidor:", err);
        addBotMessageWithVoice("X Error de enlace: Hubo un problema al conectar con el servidor.");
    }
});

function addMessage(sender, text) {
    const div = document.createElement("div");
    div.className = sender;
    div.textContent = `${sender === "user" ? "USER:" : "IVÁN:"} ${text}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addBotMessageWithVoice(text) {
    const div = document.createElement("div");
    div.className = "bot";
    div.textContent = "IVÁN: ";
    chatBox.appendChild(div);

    isTyping = true;
    setAvatarState(true);

    let index = 0;
    const speed = 30; 

    function typeWriterEffect() {
        if (index < text.length) {
            div.textContent += text[index];
            index++;
            chatBox.scrollTop = chatBox.scrollHeight;
            setTimeout(typeWriterEffect, speed);
        } else {
            isTyping = false;
            setAvatarState(false);
            sendBtn.disabled = false;
            input.focus();
        }
    }

    typeWriterEffect();
}