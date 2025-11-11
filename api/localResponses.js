import fetch from "node-fetch";
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Palabras clave en español
export const spanishKeywords = [
    "cómo te llamas",
    "como te llamas",
    "cual es tu nombre",
    "tu nombre",
    "como te llaman",
    "como te dicen",
    "quién eres",
    "quien eres",
    "tu nombre es",
    "me puedes decir tu nombre"
];

// Palabras clave en inglés
export const englishKeywords = [
    "what's your name",
    "what is your name",
    "your name",
    "what are you called",
    "what do they call you",
    "who are you",
    "your name is",
    "can you tell me your name"
];

// Keywords hora
export const timeKeywords = [
    "qué hora es",
    "me puedes decir la hora",
    "hora actual",
    "dame la hora",
    "cual es la hora",
    "la hora",
    "what time is it",
    "current time",
    "tell me the time",
    "the time"
];

// Keywords clima/temperatura
export const weatherKeywords = [
    "qué temperatura hace",
    "cómo está el clima",
    "temperatura actual",
    "la temperatura",
    "current temperature",
    "what's the weather",
    "how's the weather",
    "the weather"
];

// Normalizar mensaje: quitar ¿, ?, espacios y pasar a minúsculas
function normalizeMessage(message) {
    return message
        .toLowerCase()
        .trim()
        .replace(/^¿+/, "")   // quitar signos de apertura de pregunta
        .replace(/\?+$/, ""); // quitar signos de cierre de pregunta
}

// Función para obtener respuesta local según el mensaje
export async function getLocalResponse(userMessage) {
    const normalizedMessage = normalizeMessage(userMessage);

    const isSpanishName = spanishKeywords.some(keyword =>
        normalizedMessage.startsWith(normalizeMessage(keyword))
    );
    const isEnglishName = englishKeywords.some(keyword =>
        normalizedMessage.startsWith(normalizeMessage(keyword))
    );
    const isTime = timeKeywords.some(keyword =>
        normalizedMessage.startsWith(normalizeMessage(keyword))
    );
    const isWeather = weatherKeywords.some(keyword =>
        normalizedMessage.startsWith(normalizeMessage(keyword))
    );

    let respuesta = null;

    // Respuestas de nombre
    if (isSpanishName) {
        const respuestas = [
            "Me gusta que me digan Iván",
            "Puedes llamarme Iván, suena bien, ¿no crees?",
            "Me conocen como Iván"
        ];
        respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];
    }

    if (isEnglishName) {
        const respuestas = [
            "You can call me Ivan, sounds nice, right?",
            "People know me as Ivan",
            "My name is Ivan"
        ];
        respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];
    }

    // Respuestas de hora
    if (isTime) {
        const now = new Date();
        const options = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City' };
        const formattedTime = new Intl.DateTimeFormat('es-ES', options).format(now);

        respuesta = normalizedMessage.includes("what") ?
            `The current time is ${new Intl.DateTimeFormat('en-US', options).format(now)}` :
            `La hora actual es ${formattedTime}`;
    }


    if (isWeather) {
        try {
            const apiKey = process.env.OPENWEATHER_API_KEY;
            const city = "Mexico City"; // o extraer del mensaje del usuario
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=es`;

            const weatherRes = await fetch(url);
            const data = await weatherRes.json();

            if (data?.main?.temp != null) {
                const temp = Math.round(data.main.temp);
                respuesta = normalizedMessage.includes("what") ?
                    `The current temperature in ${city} is ${temp}°C` :
                    `La temperatura actual en ${city} es ${temp}°C`;
            } else {
                respuesta = normalizedMessage.includes("what") ?
                    "I couldn't get the temperature 😅" :
                    "No pude obtener la temperatura 😅";
            }
        } catch (err) {
            console.error("Error obteniendo el clima:", err);
            respuesta = normalizedMessage.includes("what") ?
                "I couldn't get the temperature 😅" :
                "No pude obtener la temperatura 😅";
        }
    }


    // Delay aleatorio si hay respuesta local
    if (respuesta) {
        await sleep(1000 + Math.random() * 1000); // delay 1-2s
    }

    return respuesta;
}
