const form = document.querySelector("#chat-form");
const input = document.querySelector("#user-input");
const chatBox = document.querySelector("#chat-box");
const sendBtn = document.querySelector("#send-btn");

// --- SELECCIÓN DE VIDEOS DEL AVATAR ---
const avatarIdle = document.querySelector("#avatar-idle");
const avatarTalking = document.querySelector("#avatar-talking");

let isTyping = false;

// --- NORMALIZACIÓN DE MENSAJES DE CLIMA ---
function normalizeWeatherMessage(message) {
  const lower = message.toLowerCase();

  // --- Palabras clave en inglés ---
  if (lower.includes("weather") || lower.includes("temperature")) {
    return "the weather";
  }

  // --- Palabras clave en español ---
  if (lower.includes("clima") || lower.includes("temperatura")) {
    return "la temperatura";
  }

  return message;
}

function setAvatarState(talking) {
  if (talking) {
    avatarTalking.currentTime = 0;
    avatarTalking.play().catch(err => console.log("Auto-play mitigado por políticas:", err));
    
    avatarTalking.classList.add("active");
    avatarIdle.classList.remove("active");
  } else {
    avatarIdle.classList.add("active");
    avatarTalking.classList.remove("active");
    
    setTimeout(() => {
      if (!isTyping) avatarTalking.pause();
    }, 150);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const rawMessage = input.value.trim();
  if (!rawMessage || isTyping) return;

  // --- Normalizamos el mensaje para la API interna ---
  const processedMessage = normalizeWeatherMessage(rawMessage);

  // --- Mostramos en pantalla el texto original del usuario ---
  addMessage("user", rawMessage);
  input.value = "";
  if (sendBtn) sendBtn.disabled = true;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: processedMessage }),
    });

    const data = await res.json();
    const botReply = data.text || data.error || "No tengo respuesta.";

    // --- Renderizar la respuesta con efecto typewriter y avatar hablando ---
    addBotMessageWithVoice(botReply);

  } catch (err) {
    console.error("Error al enviar mensaje:", err);
    addBotMessageWithVoice("Ocurrió un error al enviar tu mensaje.");
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

  // --- Activamos el estado de habla en el avatar ---
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
      // --- Al terminar el texto, regresamos al estado Idle ---
      isTyping = false;
      setAvatarState(false);
      if (sendBtn) sendBtn.disabled = false;
      input.focus();
    }
  }

  typeWriterEffect();
}