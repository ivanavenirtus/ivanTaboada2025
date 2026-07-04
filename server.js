import express from "express";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fetch from "node-fetch";

//IMPORTAR RESPUESTAS LOCALES
import { getLocalResponse } from "./api/localResponses.js";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const app = express();
app.use(express.json());

//CONFIGURAR RUTA PARA ARCHIVOS ESTÁTICOS
const __dirname = fileURLToPath(new URL(".", import.meta.url));
app.use(express.static(__dirname));

//ENDPOINT PARA EL CHAT
app.post("/api/chat", async (req, res) => {
    try {
        const userMessage = req.body.message || "";

        if (!OPENAI_API_KEY) {
            return res.status(401).json({ error: "Token no encontrado" });
        }

        //RESPUESTA LOCAL
        const localResponse = await getLocalResponse(userMessage);
        if (localResponse) return res.json({ text: localResponse });

        //LLAMADA A OPENAI
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "Eres un asistente útil y amable." },
                    { role: "user", content: userMessage },
                ],
                max_tokens: 200,
            }),
        });

        if (!response.ok) {
            console.error("Error HTTP:", response.status, await response.text());
            return res.status(500).json({ error: "Error al conectar con OpenAI" });
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim() || "No tengo respuesta 😅";
        res.json({ text });

    } catch (error) {
        console.error("Error interno:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

//INICIAR SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
