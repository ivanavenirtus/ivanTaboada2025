async function sendMessage() {
    const input = document.getElementById("user-input");
    const message = input.value.trim();
    if (!message) return;

    addMessage("user", message);
    input.value = "";

    const botMessageIndex = addMessage("bot", "Escribiendo...");

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
        });

        const data = await response.json();
        const botText = (data && typeof data.text === "string")
            ? data.text
            : "No tengo respuesta en este momento 😅";

        replaceLastBotMessage(botText);
    } catch (error) {
        console.error("Error al enviar el mensaje:", error);
        replaceLastBotMessage("Ocurrió un error al enviar tu mensaje 😅");
    }
}

function addMessage(sender, text) {
    const chatBox = document.getElementById("chat-box");
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", sender);
    msgDiv.textContent = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return chatBox.getElementsByClassName(sender).length - 1; // Devuelve índice opcional
}

function replaceLastBotMessage(text) {
    const chatBox = document.getElementById("chat-box");
    const last = [...chatBox.getElementsByClassName("bot")].pop();
    if (last) last.textContent = text;
}
