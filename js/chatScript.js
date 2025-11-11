const form = document.querySelector("#chat-form");
const input = document.querySelector("#user-input");
const chatBox = document.querySelector("#chat-box");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (!message) return;

  addMessage("user", message);
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
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight; 
}
