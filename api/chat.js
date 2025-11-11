// /api/chat.js
import { getLocalResponse } from '../../localResponses.js'; // ajusta la ruta
import fetch from 'node-fetch';

export default async function handler(req, res) {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Método no permitido' });
        }

        const userMessage = req.body.message || "";
        const localResponse = await getLocalResponse(userMessage);
        if (localResponse) {
            return res.status(200).json({ text: localResponse });
        }

        // Petición a OpenAI
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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
            const text = await response.text();
            console.error("❌ Error HTTP:", response.status, text);
            return res.status(500).json({ error: "Error al conectar con OpenAI" });
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim() || "No tengo respuesta 😅";
        res.status(200).json({ text });

    } catch (error) {
        console.error("💥 Error interno:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}
