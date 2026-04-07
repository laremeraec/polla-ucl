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

// 3. Diccionario de Partidos UCL Cuartos de Final IDA
// Mapeamos nombres de la API a nuestros IDs
const matchesMap = {
    "ucl1": { t1: ["sporting"], t2: ["arsenal"] },
    "ucl2": { t1: ["real madrid"], t2: ["bayern", "münchen", "munich"] },
    "ucl3": { t1: ["barcelona"], t2: ["atletico", "atlético"] },
    "ucl4": { t1: ["paris", "psg"], t2: ["liverpool"] }
};

async function syncResults() {
    console.log("⚽ Iniciando Bot Sincronizador UCL Champions League...");

    try {
        // Usamos fecha en hora Ecuador (UTC-5)
        const ecuDate = new Date(Date.now() - 5 * 60 * 60 * 1000);
        const dateStr = ecuDate.toISOString().split('T')[0];
        console.log("Buscando partidos del día (hora ECU):", dateStr);

        // Llamamos a API-Football
        const response = await axios({
            method: 'GET',
            url: `https://v3.football.api-sports.io/fixtures?date=${dateStr}&league=2&season=2025`,
            headers: {
                'x-apisports-key': process.env.API_SPORTS_KEY,
                'x-rapidapi-host': 'v3.football.api-sports.io'
            }
        });

        const fixtures = response.data.response;
        if (!fixtures || fixtures.length === 0) {
            console.log("No se encontraron partidos UCL para hoy.");
            return;
        }

        let newScores = {};

        fixtures.forEach(match => {
            const homeName = match.teams.home.name.toLowerCase();
            const awayName = match.teams.away.name.toLowerCase();

            for (const [id, teams] of Object.entries(matchesMap)) {
                const isMatch = (teams.t1.some(name => homeName.includes(name)) && teams.t2.some(name => awayName.includes(name))) ||
                                (teams.t2.some(name => homeName.includes(name)) && teams.t1.some(name => awayName.includes(name)));

                if (isMatch) {
                    let s1 = teams.t1.some(name => homeName.includes(name)) ? match.goals.home : match.goals.away;
                    let s2 = teams.t2.some(name => homeName.includes(name)) ? match.goals.home : match.goals.away;

                    if (s1 === null) s1 = 0;
                    if (s2 === null) s2 = 0;

                    if (["1H", "2H", "HT", "ET", "P", "FT", "AET", "PEN"].includes(match.fixture.status.short)) {
                        newScores[id] = {
                            s1: s1.toString(),
                            s2: s2.toString(),
                            status: match.fixture.status.short,
                            minute: match.fixture.status.elapsed || null
                        };
                        console.log(`Actualizando [${id}]: ${homeName} ${match.goals.home} - ${match.goals.away} ${awayName} (${match.fixture.status.short} ${match.fixture.status.elapsed || ''}')`);
                    }
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
        process.exit(1);
    }
}

syncResults();
