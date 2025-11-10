// chatScript.js
document.addEventListener("DOMContentLoaded", () => {

  // ===== FUNCIONES PRINCIPALES =====
  async function sendMessage() {
    const input = document.getElementById("user-input");
    const message = input.value.trim();
    if (message === "") return;

    addMessage("user", message);
    input.value = "";

    addMessage("bot", "Escribiendo...");

    try {
      // Llamada al endpoint seguro
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });

      const data = await response.json();
      console.log(data); // útil para depurar

      let botText = "No tengo respuesta en este momento 😅";
      if (data?.response) botText = data.response;

      replaceLastBotMessage(botText);

    } catch (error) {
      console.error("Error al conectar con la API:", error);
      replaceLastBotMessage("Ocurrió un error al enviar tu mensaje 😓");
    }
  }

  function addMessage(sender, text) {
    const chatBox = document.getElementById("chat-box");
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", sender);
    msgDiv.textContent = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function replaceLastBotMessage(text) {
    const chatBox = document.getElementById("chat-box");
    const last = [...chatBox.getElementsByClassName("bot")].pop();
    if (last) last.textContent = text;
  }

  // ===== EVENTOS =====
  // Enter para enviar
  document.getElementById("user-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // Botón para enviar
  document.getElementById("send-btn").addEventListener("click", sendMessage);

});
