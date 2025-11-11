const form = document.querySelector("#chat-form");
const input = document.querySelector("#user-input");
const chatBox = document.querySelector("#chat-box");

// Función para detectar si el mensaje habla de clima
function normalizeWeatherMessage(message) {
  const lower = message.toLowerCase();
  if (
    lower.includes("clima") ||
    lower.includes("temperatura") ||
    lower.includes("weather") ||
    lower.includes("temperature")
  ) {
    // Devuelve mensaje estándar según idioma
    if (lower.match(/[a-z]/)) { // si hay letras inglesas
      return "the weather";
    } else {
      return "la temperatura";
    }
  }
  return message; // si no, devuelve el mensaje original
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  let message = input.value.trim();
  if (!message) return;

  // Normalizamos el mensaje si habla de clima
  message = normalizeWeatherMessage(message);

  addMessage("user", input.value.trim()); // mostramos el mensaje original
  input.value = "";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    console.log("📩 Respuesta del servidor:", data.text || data.error);

    addMessage("bot", data.text || data.error || "No tengo respuesta 😅");
  } catch (err) {
    console.error("❌ Error al enviar mensaje:", err);
    addMessage("bot", "Ocurrió un error al enviar tu mensaje 😅");
  }
});

function addMessage(sender, text) {
  const div = document.createElement("div");
  div.className = sender;
  div.textContent = `${sender === "user" ? "USER:" : "IVÁN:"} ${text}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}
