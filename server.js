// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fetch from "node-fetch";

// Importa funciones locales
import { getLocalResponse } from "./localResponses.js";

dotenv.config({ path: ".env.local" });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(__dirname));

app.post("/api/chat", async (req, res) => {
    try {
        const userMessage = req.body.message || "";

        if (!OPENAI_API_KEY) {
            return res.status(401).json({ error: "Token no encontrado" });
        }

        // 🔍 Verificar respuesta local primero
        const localResponse = await getLocalResponse(userMessage);
        if (localResponse) {
            return res.json({ text: localResponse });
        }

        // 🚀 Si no hay respuesta local, enviamos a OpenAI
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
            console.error("❌ Error HTTP:", response.status, await response.text());
            return res.status(500).json({ error: "Error al conectar con OpenAI" });
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim() || "No tengo respuesta 😅";
        res.json({ text });

    } catch (error) {
        console.error("💥 Error interno:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
