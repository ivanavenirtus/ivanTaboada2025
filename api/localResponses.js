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
    "qué hora tenemos",
    "puedes decirme la hora",
    "hora por favor",
    "me dices la hora",
    "sabes la hora",
    "qué hora tienes",
    "qué hora son",
    "what time is it",
    "current time",
    "tell me the time",
    "the time",
    "can you tell me the time",
    "time now",
    "what's the time",
    "do you know the time",
    "give me the time"
];

// Keywords clima/temperatura
export const weatherKeywords = [
    "qué temperatura hace",
    "cómo está el clima",
    "temperatura actual",
    "la temperatura",
    "qué clima hace",
    "cómo está el tiempo",
    "dime la temperatura",
    "dame la temperatura",
    "dame el clima",
    "dime el clima",
    "sabes la temperatura",
    "sabes el clima",
    "temperatura por favor",
    "clima actual",
    "qué temperatura hay",
    "current temperature",
    "what's the weather",
    "how's the weather",
    "the weather",
    "weather now",
    "current weather",
    "what's the temperature",
    "give me the weather",
    "give me the temperature",
    "temperature now",
    "tell me the temperature"
];

// Keywords fecha
export const dateKeywords = [
    "qué día es",
    "qué fecha es",
    "dame la fecha",
    "cual es la fecha",
    "today's date",
    "what is the date",
    "give me the date",
    "current date"
];

// Normalizar mensaje: quitar ¿, ?, espacios y pasar a minúsculas
function normalizeMessage(message) {
    return message
        .toLowerCase()
        .trim()
        .replace(/^¿+/, "")
        .replace(/\?+$/, "")
        .replace(/\s+/g, " ")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Extraer ciudad del mensaje (ej. "clima en Cancún")
function extractCity(message) {
    const regex = /en\s+([a-zA-ZÀ-ÿ\s]+)/i;
    const match = message.match(regex);
    if (match && match[1]) {
        return match[1].trim();
    }
    return "Mexico City"; // valor por defecto
}

// Detecta si el mensaje es inglés o español
function detectLanguage(message) {
    const normalized = normalizeMessage(message);
    const englishWords = ["what", "weather", "temperature"];
    return englishWords.some(word => normalized.includes(word)) ? "en" : "es";
}

// Función principal de respuestas locales
export async function getLocalResponse(userMessage) {
    const normalizedMessage = normalizeMessage(userMessage);
    const lang = detectLanguage(userMessage);

    const isSpanishName = spanishKeywords.some(keyword =>
        normalizedMessage.includes(normalizeMessage(keyword))
    );
    const isEnglishName = englishKeywords.some(keyword =>
        normalizedMessage.includes(normalizeMessage(keyword))
    );
    const isTime = timeKeywords.some(keyword =>
        normalizedMessage.includes(normalizeMessage(keyword))
    );
    const isWeather = weatherKeywords.some(keyword =>
        new RegExp(`\\b${normalizeMessage(keyword)}\\b`).test(normalizedMessage)
    );

    let respuesta = null;

    // Respuestas de nombre
    if (isSpanishName) {
        const respuestas = [
            "Me gusta que me digan Iván",
            "Puedes llamarme Iván, suena bien, ¿no crees?",
            "Me conocen como Iván",
            "Me puedes llamar Iván"
        ];
        respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];
    }

    const isDate = dateKeywords.some(keyword =>
        normalizedMessage.includes(normalizeMessage(keyword))
    );

    // Respuesta de fecha
    if (isDate) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Mexico_City' };
        const formattedDate = lang === "en" ?
            new Intl.DateTimeFormat('en-US', options).format(now) :
            new Intl.DateTimeFormat('es-ES', options).format(now);

        respuesta = lang === "en" ?
            `Today's date is ${formattedDate}` :
            `La fecha de hoy es ${formattedDate}`;
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

        respuesta = lang === "en" ?
            `The current time is ${new Intl.DateTimeFormat('en-US', options).format(now)}` :
            `La hora actual es ${formattedTime}`;
    }

    // Respuestas de clima
    if (isWeather) {
        try {
            const apiKey = process.env.OPENWEATHER_API_KEY;
            const city = extractCity(userMessage);
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=${lang}`;

            const weatherRes = await fetch(url);
            const data = await weatherRes.json();

            if (data?.main?.temp != null) {
                const temp = Math.round(data.main.temp);
                respuesta = lang === "en" ?
                    `The current temperature in ${city} is ${temp}°C` :
                    `La temperatura actual en ${city} es ${temp}°C`;
            } else {
                respuesta = lang === "en" ?
                    "I couldn't get the temperature" :
                    "No pude obtener la temperatura";
            }
        } catch (err) {
            console.error("Error obteniendo el clima:", err);
            respuesta = lang === "en" ?
                "I couldn't get the temperature" :
                "No pude obtener la temperatura";
        }
    }

    // Delay aleatorio si hay respuesta local
    if (respuesta) {
        await sleep(1000 + Math.random() * 1000); // delay 1-2s
    }

    return respuesta;
}
