const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const creatorKeywords = ["quien te creo", "quien es tu creador", "quien te programo", "quien te hizo", "quien te diseño", "quien te diseñó", "quien te desarrolló", "who created you", "who is your creator", "who made you", "who coded you", "who developed you"];
const ageKeywords = ["cuantos años tienes", "tu edad", "how old are you", "your age"];
const birthdayKeywords = ["cuando es tu cumpleaños", "fecha de cumpleaños", "cuando cumples", "when is your birthday", "birthday"];
const petKeywords = ["tienes mascotas", "mascotas", "do you have pets", "pet names"];
const moodKeywords = ["como estas", "como te sientes", "how are you", "how are you doing"];
const foodKeywords = ["comida favorita", "que te gusta comer", "favorite food", "what do you like to eat"];
const musicKeywords = ["musica favorita", "que musica escuchas", "favorite music", "what music do you like"];
const locationKeywords = ["de donde eres", "donde vives", "where are you from", "where do you live"];
const goodbyeKeywords = ["adios", "chao", "hasta luego", "bye", "goodbye", "see you"];
const hobbiesKeywords = ["que te gusta hacer", "cuales son tus hobbies", "what do you like to do", "what are your hobbies"];
const siblingsKeywords = ["si tienes hermanos", "tienes hermanos", "tienes hermana", "tienes hermanos o hermanas", "hermanos", "tienes familia", "do you have siblings", "do you have a brother", "do you have a sister", "siblings", "brother", "sister", "do you have any siblings"];
const nameKeywords = ["como te llamas", "tu nombre", "what is your name", "your name"];

const keywordGroups = {
    name: nameKeywords,
    age: ageKeywords,
    birthday: birthdayKeywords,
    pet: petKeywords,
    siblings: siblingsKeywords,
    creator: creatorKeywords,
    mood: moodKeywords,
    food: foodKeywords,
    music: musicKeywords,
    location: locationKeywords,
    goodbye: goodbyeKeywords,
    hobbies: hobbiesKeywords
};

const cannedResponses = {
    name: {
        es: "Me puedes llamar Iván.",
        en: "My name is Ivan!"
    },
    age: {
        es: "Tengo 24 años.",
        en: "I am 24 years old."
    },
    pet: {
        es: "Tengo una gatita llamada Ophelia y dos perritas: Kyoto y Akira.",
        en: "I have a kitty named Ophelia and two doggies: Kyoto and Akira!"
    },
    siblings: {
        es: "Tengo una hermana que se llama Sofía.",
        en: "I have one sister named Sofía."
    },
    creator: {
        es: "Fui creado por Iván.",
        en: "I was created by Iván."
    }
};

const responses = {
    mood: {
        es: ["¡Todo excelente!", "¡Muy bien!", "Todo genial, ¿y tú?"],
        en: ["I'm doing great!", "Pretty good!", "Everything is awesome!"]
    },
    food: {
        es: ["¡Los tacos al pastor son lo mejor!", "La pizza y el sushi son mis favoritos.", "Soy fan de los chilaquiles."],
        en: ["Tacos al pastor are the best!", "Pizza and sushi are my favorites.", "I love chilaquiles!"]
    },
    music: {
        es: ["Me encanta el Trap y el Rock.", "El Trap es lo mío.", "Me gusta descubrir beats de Trap."],
        en: ["I love Trap and Rock.", "Trap is my thing.", "I love discovering new Trap beats."]
    },
    location: {
        es: ["Soy de CDMX.", "Mi creador es de México.", "CDMX es mi hogar."],
        en: ["I'm from Mexico City!", "My creator is from Mexico.", "CDMX is my home."]
    },
    goodbye: {
        es: ["¡Hasta luego, cuídate!", "¡Nos vemos!", "¡Chao, aquí estaré!"],
        en: ["Goodbye, take care!", "See you later!", "Bye, I'll be here!"]
    },
    hobbies: {
        es: ["Me encanta crear música trap.", "Disfruto jugar videojuegos.", "Programar es mi pasatiempo favorito."],
        en: ["I love creating trap music.", "I enjoy playing video games.", "Programming is my favorite hobby."]
    },
    birthday: {
        es: ["Mi cumpleaños es el 18 de octubre.", "¡Celebro el 18 de octubre!"],
        en: ["My birthday is October 18th.", "I celebrate on October 18th!"]
    }
};

// --- FUNCIONES DE APOYO ---
function normalizeMessage(message) {
    return message.toLowerCase().trim()
        .replace(/^¿+/, "").replace(/\?+$/, "")
        .replace(/\s+/g, " ")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function detectLanguage(message) {
    const normalized = normalizeMessage(message);
    // --- Patrones en inglés para detección de idioma ---
    const englishPatterns = ["what", "how", "who", "your", "time", "weather", "age", "old", "bye", "live", "eat", "hobbies", "pets", "birthday"];
    return englishPatterns.some(word => normalized.includes(word)) ? "en" : "es";
}

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// --- FUNCIÓN PRINCIPAL ---
export async function getLocalResponse(userMessage) {
    const normalizedMessage = normalizeMessage(userMessage);
    const lang = detectLanguage(userMessage);

    // --- MAPEO DE PALABRAS CLAVE (KEYWORDS) ---
    const isName = nameKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));
    const isAge = ageKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));
    const isBirthday = birthdayKeywords.some(k => normalizedMessage.includes(normalizeMessage(k))); 
    const isPet = petKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));
    const isSiblings = siblingsKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));
    const isCreator = creatorKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));
    const isMood = moodKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));
    const isFood = foodKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));
    const isMusic = musicKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));
    const isLocation = locationKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));
    const isGoodbye = goodbyeKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));
    const isHobby = hobbiesKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));

    let respuesta = null;
    if (isName) {
        respuesta = lang === "en" ? "My name is Ivan!" : "Me puedes llamar Iván.";
    } else if (isAge) {
        respuesta = lang === "en" ? "I am 24 years old." : "Tengo 24 años.";
    } else if (isBirthday) { 
        respuesta = getRandom(responses.birthday[lang]);
    } else if (isPet) {
        respuesta = lang === "en" 
            ? "I have a kitty named Ophelia and two doggies: Kyoto and Akira!" 
            : "Tengo una gatita llamada Ophelia y dos perritas: Kyoto y Akira.";
    } else if (isSiblings) {
        respuesta = lang === "en"
            ? "I have one sister named Sofía."
            : "Tengo una hermana que se llama Sofía.";
    } else if (isCreator) {
        respuesta = lang === "en" ? "I was created by Iván." : "Fui creado por Iván.";
    } else if (isMood) {
        respuesta = getRandom(responses.mood[lang]);
    } else if (isFood) {
        respuesta = getRandom(responses.food[lang]);
    } else if (isMusic) {
        respuesta = getRandom(responses.music[lang]);
    } else if (isLocation) {
        respuesta = getRandom(responses.location[lang]);
    } else if (isGoodbye) {
        respuesta = getRandom(responses.goodbye[lang]);
    } else if (isHobby) {
        respuesta = getRandom(responses.hobbies[lang]);
    }

    if (respuesta) {
        await sleep(1000 + Math.random() * 1000);
    }
    
    return respuesta;
}