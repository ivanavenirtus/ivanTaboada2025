import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs";

// --- IMPORTAR RESPUESTAS LOCALES ---
import { getLocalResponse } from "./api/localResponses.js";

// --- CARGAR .env.local SI EXISTE ---
if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}
dotenv.config();

// Cambiado para usar tus credenciales de Groq configuradas en Vercel
const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const FISH_API_KEY = process.env.FISH_API_KEY;
const MY_VOICE_ID = process.env.MY_VOICE_ID;

const app = express();
app.use(express.json());

// --- ENDPOINT PARA EL CHAT (AHORA CON GROQ) ---
app.post("/api/chat", async (req, res) => {
    try {
        const userMessage = req.body.message || "";

        if (!GROQ_API_KEY) {
            return res.status(401).json({ error: "Token de Groq no encontrado en el servidor" });
        }

        // --- RESPUESTA LOCAL ---
        const localResponse = await getLocalResponse(userMessage);
        if (localResponse) return res.json({ text: localResponse });

        // --- LLAMADA A GROQ ---
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: "llama3-8b-8192", // Modelo rápido y eficiente de Groq
                messages: [
                    { role: "system", content: "Eres un asistente útil y amable." },
                    { role: "user", content: userMessage },
                ],
                max_tokens: 200,
            }),
        });

        if (!response.ok) {
            console.error("Error HTTP Groq:", response.status, await response.text());
            return res.status(500).json({ error: "Error al conectar con Groq" });
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim() || "No tengo respuesta 😅";
        res.json({ text });

    } catch (error) {
        console.error("Error interno chat:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// --- ENDPOINT PARA TTS (FISH AUDIO) ---
app.post("/api/tts", async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ error: "Texto vacío" });
        }
        if (!FISH_API_KEY || !MY_VOICE_ID) {
            return res.status(401).json({ error: "FISH_API_KEY o MY_VOICE_ID no configurados" });
        }

        const response = await fetch("https://api.fish.audio/v1/tts", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${FISH_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                text: text.trim(),
                reference_id: MY_VOICE_ID,
                format: "mp3",
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Error Fish Audio:", response.status, errText);
            return res.status(500).json({ error: "Error al generar audio con Fish Audio" });
        }

        const audioBuffer = await response.arrayBuffer();
        res.set("Content-Type", "audio/mpeg");
        res.send(Buffer.from(audioBuffer));
    } catch (error) {
        console.error("Error interno TTS:", error);
        res.status(500).json({ error: "Error interno del servidor (TTS)" });
    }
});

// --- INICIAR SERVIDOR (SOLO EN DESARROLLO LOCAL) ---
if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
}

export default app;