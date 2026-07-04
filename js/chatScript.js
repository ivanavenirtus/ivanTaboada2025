const form = document.querySelector("#chat-form");
const input = document.querySelector("#user-input");
const chatBox = document.querySelector("#chat-box");
const sendBtn = document.querySelector("#send-btn");

// Selectores adaptables para tus elementos de Avatar (Soporta GIFs e imágenes)
const avatarIdle = document.querySelector("#avatar-idle");
const avatarTalking = document.querySelector("#avatar-talking");

let isTyping = false;

function normalizeWeatherMessage(message) {
  const lower = message.toLowerCase();
  if (lower.includes("weather") || lower.includes("temperature")) return "the weather";
  if (lower.includes("clima") || lower.includes("temperatura")) return "la temperatura";
  return message;
}

function setAvatarState(talking) {
  // Manejo de estados intercambiando clases y activando el Glow Cyan
  if (talking) {
    if (avatarTalking) {
      avatarTalking.classList.add("active", "talking-ui");
      if (typeof avatarTalking.play === "function") {
        avatarTalking.currentTime = 0;
        avatarTalking.play().catch(() => {});
      }
    }
    if (avatarIdle) avatarIdle.classList.remove("active", "talking-ui");
  } else {
    if (avatarIdle) avatarIdle.classList.add("active");
    if (avatarTalking) avatarTalking.classList.remove("active", "talking-ui");
    
    setTimeout(() => {
      if (!isTyping && avatarTalking && typeof avatarTalking.pause === "function") {
        avatarTalking.pause();
      }
    }, 150);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const rawMessage = input.value.trim();
  if (!rawMessage || isTyping) return;

  const processedMessage = normalizeWeatherMessage(rawMessage);

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

    addBotMessageWithVoice(botReply);
  } catch (err) {
    console.error(err);
    addBotMessageWithVoice("Ocurrió un error al enviar tu mensaje.");
  }
});

// Mensaje Usuario - Genera la burbuja contenedora estructurada para el CSS
function addMessage(sender, text) {
  const div = document.createElement("div");
  // Esta clase compuesta es vital para que se separen los lados y se armen los contornos
  div.className = `message-wrapper ${sender}`;

  const name = document.createElement("div");
  name.className = "sender-name";
  name.textContent = sender === "user" ? "TÚ" : "IVÁN";

  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = text;

  div.appendChild(name);
  div.appendChild(content);
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Mensaje Bot - Genera la burbuja de Iván a la izquierda con efecto typewriter
function addBotMessageWithVoice(text) {
  const div = document.createElement("div");
  div.className = "message-wrapper bot";

  const name = document.createElement("div");
  name.className = "sender-name";
  name.textContent = "IVÁN";

  const content = document.createElement("div");
  content.className = "message-content";

  div.appendChild(name);
  div.appendChild(content);
  chatBox.appendChild(div);

  isTyping = true;
  setAvatarState(true);

  let index = 0;
  const speed = 30;

  function typeWriter() {
    if (index < text.length) {
      content.textContent += text[index];
      index++;
      chatBox.scrollTop = chatBox.scrollHeight;
      setTimeout(typeWriter, speed);
    } else {
      isTyping = false;
      setAvatarState(false);
      if (sendBtn) sendBtn.disabled = false;
    }
  }
  typeWriter();
}