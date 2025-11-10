async function sendMessage() {
  const input = document.getElementById("user-input");
  const message = input.value.trim();
  if (message === "") return;

  addMessage("user", message);
  input.value = "";

  addMessage("bot", "Escribiendo...");

  try {
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/mrm8488/t5-base-finetuned-spanish-chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "API_KEY_AQUI"
        },
        body: JSON.stringify({
          inputs: message
        })
      }
    );

    const data = await response.json();
    console.log(data); // útil para depurar

    let botText = "No tengo respuesta en este momento 😅";

    // algunos modelos devuelven objetos diferentes, verificamos ambos casos
    if (Array.isArray(data) && data[0]?.generated_text) {
      botText = data[0].generated_text;
    } else if (data?.generated_text) {
      botText = data.generated_text;
    }

    replaceLastBotMessage(botText);
  } catch (error) {
    console.error("Error al conectar con la API:", error);
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
