// Delay asíncrono
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
        const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        if (userMessage.toLowerCase().includes("what")) {
            respuesta = `The current time is ${timeStr}`;
        } else {
            respuesta = `La hora actual es ${timeStr}`;
        }
    }

    if (isTime) {
    const now = new Date();
    const options = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City' };
    const formattedTime = new Intl.DateTimeFormat('es-ES', options).format(now);
    
    respuesta = `La hora actual es ${formattedTime}`;
    if (userMessage.toLowerCase().includes("what")) {
        const formattedTimeEn = new Intl.DateTimeFormat('en-US', options).format(now);
        respuesta = `The current time is ${formattedTimeEn}`;
    }
}


    // Respuestas de clima/temperatura (ejemplo estático, puedes usar API real)
    if (isWeather) {
        if (userMessage.toLowerCase().includes("what")) {
            respuesta = "The current temperature is 25°C";
        } else {
            respuesta = "La temperatura actual es 25°C";
        }
    }

    // Delay aleatorio si hay respuesta local
    if (respuesta) {
        await sleep(1000 + Math.random() * 1000); // delay 1-2s
    }

    return respuesta;
}
