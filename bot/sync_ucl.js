const axios = require('axios');
const admin = require('firebase-admin');

// 1. Configurar Entorno Seguro
require('dotenv').config();

// 2. Inicializar SDK de Servidor de Firebase
const serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccountKey),
        databaseURL: "https://" + serviceAccountKey.project_id + "-default-rtdb.firebaseio.com"
    });
}
const db = admin.firestore();

// 3. Diccionario de Partidos UCL Semifinales IDA
const matchesMap = {
    "ucl1": { t1: ["arsenal"], t2: ["atletico", "atlético", "atletico de madrid", "atlético de madrid"] },
    "ucl2": { t1: ["bayern", "münchen", "munich", "fc bayern"], t2: ["paris", "psg", "paris saint-germain"] }
};

// Mapeo de estados football-data.org → nuestros códigos
const STATUS_MAP = {
    "SCHEDULED":   null,
    "TIMED":       null,
    "IN_PLAY":     "2H",   // en juego (se refina con half)
    "PAUSED":      "HT",   // medio tiempo
    "FINISHED":    "FT",
    "SUSPENDED":   null,
    "POSTPONED":   null,
    "CANCELLED":   null,
    "AWARDED":     "FT"
};

async function syncResults() {
    console.log("⚽ Iniciando Bot Sincronizador Semifinales UCL Champions League...");

    try {
        // Usamos fecha en hora Ecuador (UTC-5)
        const ecuDate = new Date(Date.now() - 5 * 60 * 60 * 1000);
        const dateStr = ecuDate.toISOString().split('T')[0];
        console.log("Buscando partidos del día (hora ECU):", dateStr);

        // football-data.org — UCL = código "CL", season 2025
        const response = await axios({
            method: 'GET',
            url: `https://api.football-data.org/v4/competitions/CL/matches?dateFrom=${dateStr}&dateTo=${dateStr}`,
            headers: {
                'X-Auth-Token': process.env.FOOTBALL_DATA_KEY
            }
        });

        const fixtures = response.data.matches;
        if (!fixtures || fixtures.length === 0) {
            console.log("ℹ️ No hay partidos UCL hoy. Bot finaliza correctamente.");
            process.exit(0);
        }

        console.log(`Encontrados ${fixtures.length} partido(s) UCL hoy.`);
        let newScores = {};

        fixtures.forEach(match => {
            const homeName = match.homeTeam.name.toLowerCase();
            const awayName = match.awayTeam.name.toLowerCase();

            for (const [id, teams] of Object.entries(matchesMap)) {
                const isMatch =
                    (teams.t1.some(n => homeName.includes(n)) && teams.t2.some(n => awayName.includes(n))) ||
                    (teams.t2.some(n => homeName.includes(n)) && teams.t1.some(n => awayName.includes(n)));

                if (isMatch) {
                    const apiStatus = match.status;
                    let statusCode = STATUS_MAP[apiStatus];

                    // Refinar 1er vs 2do tiempo
                    if (apiStatus === "IN_PLAY") {
                        const minute = match.minute || 0;
                        statusCode = minute <= 45 ? "1H" : "2H";
                    }

                    // Solo actualizar si el partido está en curso o terminado
                    if (!statusCode) {
                        console.log(`Partido [${id}] aún no ha comenzado (${apiStatus}).`);
                        return;
                    }

                    let s1 = teams.t1.some(n => homeName.includes(n))
                        ? (match.score.fullTime.home ?? match.score.halfTime.home ?? 0)
                        : (match.score.fullTime.away ?? match.score.halfTime.away ?? 0);
                    let s2 = teams.t2.some(n => homeName.includes(n))
                        ? (match.score.fullTime.home ?? match.score.halfTime.home ?? 0)
                        : (match.score.fullTime.away ?? match.score.halfTime.away ?? 0);

                    if (s1 === null) s1 = 0;
                    if (s2 === null) s2 = 0;

                    newScores[id] = {
                        s1: s1.toString(),
                        s2: s2.toString(),
                        status: statusCode,
                        minute: match.minute || null
                    };
                    console.log(`Actualizando [${id}]: ${homeName} ${s1} - ${s2} ${awayName} (${statusCode} ${match.minute || ''})`);
                }
            }
        });

        if (Object.keys(newScores).length > 0) {
            console.log("Subiendo actualización UCL a Firebase...");
            await db.collection('admin_ucl').doc('resultados').set({
                partidos: newScores,
                ultima_sincronizacion: new Date().toISOString()
            }, { merge: true });
            console.log("✅ ¡Resultados UCL actualizados en vivo!");
        } else {
            console.log("Ninguno de los partidos UCL ha iniciado o no hay cambios.");
        }

    } catch (error) {
        console.error("❌ Error en sincronización UCL:", error.message);
        const ecuDate = new Date(Date.now() - 5 * 60 * 60 * 1000);
        const dateStr = ecuDate.toISOString().split('T')[0];
        const matchDays = ['2026-05-05', '2026-05-06'];
        if (matchDays.includes(dateStr)) {
            console.error("❌ Error en día de partido — revisar urgente.");
            process.exit(1);
        } else {
            console.log("ℹ️ Error fuera de días de partido — salida limpia.");
            process.exit(0);
        }
    }
}

syncResults();
