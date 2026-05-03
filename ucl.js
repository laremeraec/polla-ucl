import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB5xuj_6jJi6obCE48RALyunrUwML_BwHI",
  authDomain: "polla-mundialista-la-rem-bacb9.firebaseapp.com",
  projectId: "polla-mundialista-la-rem-bacb9",
  storageBucket: "polla-mundialista-la-rem-bacb9.firebasestorage.app",
  messagingSenderId: "186398392200",
  appId: "1:186398392200:web:876f9abdde8f207920443d",
  measurementId: "G-MTW2HKMNXR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================================
// ESCUDOS — Semifinales UCL 2025-2026
// ==========================================================
const CRESTS = {
    arsenal:   "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg",
    atletico:  "assets/atletico.png",
    bayern:    "https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg",
    psg:       "https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg"
};

// Herramienta de admin para pruebas
window.simularPartidoUCL = async function(matchId, s1, s2, status, minute) {
    console.log(`🤖 Forzando resultado Semifinal UCL: ${matchId} [${s1}-${s2}]`);
    await setDoc(doc(db, "admin_ucl", "resultados"), {
        partidos: { [matchId]: { s1: s1.toString(), s2: s2.toString(), status: status, minute: minute } },
        ultima_sincronizacion: new Date().toISOString()
    }, { merge: true });
    console.log("✅ Simulación Semifinal UCL completada.");
};

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');

    // Selector de equipos
    // Checkbox "No tengo segundo nombre"
    const noSecondNameChk = document.getElementById('noSecondName');
    const secondNameInput = document.getElementById('secondName');
    if (noSecondNameChk && secondNameInput) {
        noSecondNameChk.addEventListener('change', () => {
            if (noSecondNameChk.checked) {
                secondNameInput.value = '';
                secondNameInput.disabled = true;
                secondNameInput.style.opacity = '0.4';
            } else {
                secondNameInput.disabled = false;
                secondNameInput.style.opacity = '1';
            }
        });
    }

    const selectLocalTeam = document.getElementById('localTeam');
    const inputOtherLocalTeam = document.getElementById('otherLocalTeam');
    if(selectLocalTeam && inputOtherLocalTeam) {
        selectLocalTeam.addEventListener('change', (e) => {
            if(e.target.value === "Otros") {
                inputOtherLocalTeam.style.display = "block";
                inputOtherLocalTeam.required = true;
            } else {
                inputOtherLocalTeam.style.display = "none";
                inputOtherLocalTeam.required = false;
                inputOtherLocalTeam.value = "";
            }
        });
    }

    const selectIntTeam = document.getElementById('internationalTeam');
    const inputOtherIntTeam = document.getElementById('otherInternationalTeam');
    if(selectIntTeam && inputOtherIntTeam) {
        selectIntTeam.addEventListener('change', (e) => {
            if(e.target.value === "Otros") {
                inputOtherIntTeam.style.display = "block";
                inputOtherIntTeam.required = true;
            } else {
                inputOtherIntTeam.style.display = "none";
                inputOtherIntTeam.required = false;
                inputOtherIntTeam.value = "";
            }
        });
    }

    const loginForm = document.getElementById('loginForm');
    const registerModal = document.getElementById('registerModal');
    const loginModal = document.getElementById('loginModal');

    let isUserRegistered = false;
    let currentUserData = null;
    const loginBtns = document.querySelectorAll('.login-btn');
    const registerBtns = document.querySelectorAll('.register-btn');
    const closeBtns = document.querySelectorAll('.close-modal');

    const switchToLogin = document.getElementById('switchToLogin');
    const switchToRegister = document.getElementById('switchToRegister');

    registerBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!isUserRegistered) {
                registerModal.classList.add('show');
                loginModal.classList.remove('show');
            }
        });
    });

    loginBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!isUserRegistered) {
                loginModal.classList.add('show');
                registerModal.classList.remove('show');
            }
        });
    });

    switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerModal.classList.remove('show');
        loginModal.classList.add('show');
    });

    switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginModal.classList.remove('show');
        registerModal.classList.add('show');
    });

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });

    // ===========================
    // Firebase Auth
    // ===========================
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            isUserRegistered = true;

            const docRef = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                currentUserData = docSnap.data();
            }

            loginBtns.forEach(btn => {
                btn.textContent = 'Cerrar Sesión';
                btn.style.background = 'transparent';
                btn.style.border = '1px solid var(--primary)';
                btn.style.color = 'var(--primary)';
            });

            loginBtns.forEach(btn => {
                btn.onclick = (e) => {
                    if (isUserRegistered && btn.textContent === 'Cerrar Sesión') {
                        e.preventDefault();
                        e.stopPropagation();
                        signOut(auth).then(() => {
                            window.location.reload();
                        });
                    }
                };
            });

            // Ocultar botones de registro inmediatamente
            registerBtns.forEach(btn => {
                btn.style.display = 'none';
            });

            if (typeof loadDashboard === 'function') {
                await loadDashboard(user);
                // Scroll automático al dashboard
                const dash = document.getElementById('dashboard');
                if (dash) {
                    setTimeout(() => dash.scrollIntoView({ behavior: 'smooth' }), 300);
                }
            }
        } else {
            isUserRegistered = false;
            currentUserData = null;
            const dashboardSection = document.getElementById('dashboard');
            if(dashboardSection) dashboardSection.classList.add('hidden');
            registerBtns.forEach(btn => {
                btn.textContent = 'Unirse Ahora';
                btn.onclick = null;
            });
        }
    });

    // Registration
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pwd1 = document.getElementById('registerPassword').value;
        const pwd2 = document.getElementById('confirmPassword').value;
        if (pwd1 !== pwd2) {
            alert("Las contraseñas no coinciden. Por favor verifica.");
            return;
        }

        const email = document.getElementById('email').value.toLowerCase().trim();

        // Validar campos obligatorios de nombre
        const firstName = document.getElementById('firstName').value.trim();
        const noSecondName = document.getElementById('noSecondName').checked;
        const secondName = document.getElementById('secondName').value.trim();
        const firstLastName = document.getElementById('firstLastName').value.trim();
        const secondLastName = document.getElementById('secondLastName').value.trim();

        if (!firstName) { alert('Por favor ingresa tu Primer Nombre.'); return; }
        if (!noSecondName && !secondName) { alert('Por favor ingresa tu Segundo Nombre o marca "No tengo segundo nombre".'); return; }
        if (!firstLastName) { alert('Por favor ingresa tu Primer Apellido.'); return; }
        if (!secondLastName) { alert('Por favor ingresa tu Segundo Apellido.'); return; }

        // Construir nombre completo
        const nameParts = [firstName, noSecondName ? '' : secondName, firstLastName, secondLastName].filter(p => p);
        let fullName = nameParts.join(' ');
        fullName = fullName.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        let phone = document.getElementById('phone').value.trim();
        // Asegurar que el teléfono se guarda como string con 0 al inicio
        if (phone && !phone.startsWith('0') && phone.length === 9) phone = '0' + phone;
        phone = String(phone);
        const dob = document.getElementById('dob').value;
        let city = document.getElementById('city').value.trim();
        city = city.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        let province = document.getElementById('province').value.trim();
        province = province.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        let localTeam = document.getElementById('localTeam').value;
        if(localTeam === "Otros") localTeam = document.getElementById('otherLocalTeam').value.trim();
        let internationalTeam = document.getElementById('internationalTeam').value;
        if(internationalTeam === "Otros") internationalTeam = document.getElementById('otherInternationalTeam').value.trim();
        const isEcuadorian = document.getElementById('isEcuadorian').checked;

        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creando cuenta...';
        submitBtn.disabled = true;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pwd1);
            const user = userCredential.user;
            await setDoc(doc(db, "usuarios", user.uid), {
                nombre_completo: fullName,
                primer_nombre: firstName,
                segundo_nombre: noSecondName ? '' : secondName,
                primer_apellido: firstLastName,
                segundo_apellido: secondLastName,
                email, telefono: phone, fecha_nacimiento: dob,
                ciudad: city, provincia: province, equipo_ecuador: localTeam,
                equipo_internacional: internationalTeam, es_de_ecuador: isEcuadorian,
                fecha_registro: new Date().toISOString()
            });
            registerModal.classList.remove('show');
            alert('¡Registro exitoso! Ya puedes guardar tus pronósticos.');
            registerForm.reset();
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') alert('Este correo ya está registrado. Por favor, Inicia Sesión.');
            else if (error.code === 'auth/weak-password') alert('La contraseña debe tener al menos 6 caracteres.');
            else alert('Hubo un problema al crear la cuenta: ' + error.message);
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pwd = document.getElementById('loginPassword').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Ingresando...';
        submitBtn.disabled = true;
        try {
            await signInWithEmailAndPassword(auth, email, pwd);
            loginModal.classList.remove('show');
            loginForm.reset();
        } catch (error) {
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password')
                alert('Correo o contraseña incorrectos.');
            else alert('Ocurrió un problema: ' + error.message);
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // Forgot Password
    const forgotPasswordLink = document.getElementById('forgotPassword');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('loginEmail').value;
            if (!emailInput) { alert('Ingresa tu correo antes de pedir restablecer.'); return; }
            try {
                await sendPasswordResetEmail(auth, emailInput);
                alert('¡Te hemos enviado un correo para restablecer tu contraseña!');
            } catch (error) {
                if (error.code === 'auth/user-not-found') alert('No tenemos cuenta con ese correo.');
                else alert('Error: ' + error.message);
            }
        });
    }

    // Scroll navbar effect
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('.navbar');
        nav.style.background = window.scrollY > 50 ? 'rgba(10, 14, 23, 0.95)' : 'rgba(10, 14, 23, 0.8)';
    });

    // ===============================================================
    // PARTIDOS UCL — Semifinales IDA — Champions League 2025-2026
    // ===============================================================
    // Hora Ecuador = UTC-5. Partidos a las 21:00 CET = 14:00 ECU
    const CUTOFF_DATE = new Date("2026-05-05T14:00:00-05:00"); // Primer partido: Arsenal vs Atlético

    const dashboardSection = document.getElementById('dashboard');
    const matchesContainer = document.getElementById('matches-container');
    const savePredictionsBtn = document.getElementById('savePredictionsBtn');

    const matchesList = [
        {
            id: "ucl1",
            team1: "Arsenal",            crest1: CRESTS.arsenal,
            team2: "Atlético de Madrid", crest2: CRESTS.atletico,
            time: "2026-05-05T14:00:00-05:00",
            displayTime: "Martes 5 May · 14:00 (ECU)"
        },
        {
            id: "ucl2",
            team1: "Bayern Munich",      crest1: CRESTS.bayern,
            team2: "PSG",                crest2: CRESTS.psg,
            time: "2026-05-06T14:00:00-05:00",
            displayTime: "Miércoles 6 May · 14:00 (ECU)"
        }
    ];

    const viewerModal = document.getElementById('viewerModal');
    const viewerName = document.getElementById('viewerName');
    const viewerMatches = document.getElementById('viewerMatches');

    // ===================================
    // Viewer Modal — Auditoría Pública
    // ===================================
    function openViewerModal(userData) {
        viewerName.textContent = userData.nombre;
        viewerMatches.innerHTML = '';

        if (matchesList.length === 0) {
            viewerMatches.innerHTML = '<p style="text-align:center; color: var(--text-muted);">Sin partidos disponibles.</p>';
        } else {
            matchesList.forEach(match => {
                const matchStart = new Date(match.time);
                const isMatchStarted = new Date() >= matchStart;
                const p = userData.predicciones[match.id] || { s1: '-', s2: '-' };
                const real = lastResultados[match.id];

                const scoreHTML = isMatchStarted
                    ? `${p.s1} - ${p.s2}`
                    : `<span title="Se revela al iniciar el partido">🔒</span>`;

                let realHTML = '';
                if (real) {
                    const isFinished = real.status === 'FT' || real.status === 'AET';
                    const isLiveNow = !isFinished && real.status;
                    const realColor = isFinished ? '#22c55e' : '#6cb4ee';
                    const liveTag = isLiveNow ? `<span style="color:#22c55e; margin-left:6px;">● En vivo</span>` : '';
                    realHTML = `<div style="width:100%; text-align:center; margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.08); font-size:0.82rem; color:#9ca3af;">
                        Real: <strong style="color:${realColor}; font-size:1rem;">${real.s1} - ${real.s2}</strong>${liveTag}
                    </div>`;
                }

                const card = document.createElement('div');
                card.className = 'ucl-viewer-card';
                card.style.flexWrap = 'wrap';
                card.innerHTML = `
                    <div class="ucl-viewer-team vt-left">
                        <span class="ucl-vname">${match.team1}</span>
                        <img src="${match.crest1}" class="ucl-viewer-crest" alt="${match.team1}">
                    </div>
                    <div class="ucl-viewer-score">${scoreHTML}</div>
                    <div class="ucl-viewer-team vt-right">
                        <img src="${match.crest2}" class="ucl-viewer-crest" alt="${match.team2}">
                        <span class="ucl-vname">${match.team2}</span>
                    </div>
                    ${realHTML}
                `;
                viewerMatches.appendChild(card);
            });
        }
        viewerModal.classList.add('show');
    }

    // ===================================
    // Dashboard — Pronósticos del usuario
    // ===================================
    async function loadDashboard(user) {
        dashboardSection.classList.remove('hidden');

        registerBtns.forEach(btn => {
            btn.textContent = 'Ver Mis Pronósticos';
            btn.onclick = (e) => {
                e.preventDefault();
                dashboardSection.scrollIntoView({ behavior: 'smooth' });
            };
        });

        const now = new Date();
        const isClosed = now >= CUTOFF_DATE;

        if (isClosed) {
            savePredictionsBtn.textContent = 'Los partidos han comenzado (Cerrado)';
            savePredictionsBtn.disabled = true;
            savePredictionsBtn.style.opacity = '0.5';
            savePredictionsBtn.style.cursor = 'not-allowed';
        }

        let savedPredictions = {};
        try {
            const docRef = doc(db, "predicciones_ucl", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().partidos) {
                savedPredictions = docSnap.data().partidos;
            }
        } catch (e) {
            console.error("No se pudieron cargar las predicciones UCL", e);
        }

        matchesContainer.innerHTML = '';

        if (matchesList.length === 0) {
            matchesContainer.innerHTML = `
                <div class="glass" style="padding: 2rem; text-align: center; border-radius: 12px; max-width: 500px; width: 100%;">
                    <h3 style="color: #6cb4ee; margin-bottom: 1rem; font-size: 1.5rem;">Próximamente ⏱️</h3>
                    <p style="color: var(--text-muted); line-height: 1.6;">Los partidos de la Champions League se publicarán aquí.</p>
                </div>`;
            savePredictionsBtn.style.display = 'none';
        } else {
            savePredictionsBtn.style.display = 'inline-block';
            matchesList.forEach(match => {
                const p = savedPredictions[match.id] || { s1: '', s2: '' };
                const isMatchLocked = new Date() >= new Date(match.time);
                const isInputDisabled = isClosed || isMatchLocked;

                const card = document.createElement('div');
                card.className = 'ucl-match-card glass';
                card.innerHTML = `
                    <div class="ucl-match-date">
                        ${match.displayTime} ${isMatchLocked ? '<span style="color:#ef4444; font-weight:bold; margin-left:5px;">(Cerrado)</span>' : ''}
                    </div>
                    <div id="liveMarker_${match.id}" class="ucl-live-marker"></div>
                    <div id="realScoreBox_${match.id}" style="display:none; margin: 0.5rem auto 1rem; max-width:340px; background:rgba(0,86,162,0.15); border:1px solid rgba(108,180,238,0.3); border-radius:10px; padding:0.6rem 1rem; text-align:center;">
                        <div style="font-size:0.7rem; color:#9ca3af; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Resultado Oficial</div>
                        <div id="realScoreVal_${match.id}" style="font-size:2rem; font-weight:900; color:#fff; letter-spacing:4px;">- : -</div>
                        <div id="realScoreStatus_${match.id}" style="font-size:0.75rem; margin-top:4px; color:#6cb4ee;"></div>
                    </div>
                    <div class="ucl-teams-row">
                        <div class="ucl-team team-left">
                            <span class="ucl-team-name">${match.team1}</span>
                            <img src="${match.crest1}" class="ucl-crest" alt="${match.team1}">
                        </div>
                        <div class="ucl-score-block">
                            <input type="number" min="0" class="ucl-score-input p-input" data-match="${match.id}" data-team="1" placeholder="-" value="${p.s1}" ${isInputDisabled ? 'disabled' : ''}>
                            <span class="ucl-vs">VS</span>
                            <input type="number" min="0" class="ucl-score-input p-input" data-match="${match.id}" data-team="2" placeholder="-" value="${p.s2}" ${isInputDisabled ? 'disabled' : ''}>
                        </div>
                        <div class="ucl-team team-right">
                            <img src="${match.crest2}" class="ucl-crest" alt="${match.team2}">
                            <span class="ucl-team-name">${match.team2}</span>
                        </div>
                    </div>
                `;
                matchesContainer.appendChild(card);
            });
        }

        // Save predictions
        savePredictionsBtn.onclick = async () => {
            if (new Date() >= CUTOFF_DATE) {
                alert('Los partidos ya empezaron. El tiempo para predecir se ha cerrado.');
                window.location.reload();
                return;
            }

            savePredictionsBtn.textContent = 'Guardando...';
            savePredictionsBtn.disabled = true;

            const inputs = document.querySelectorAll('.p-input');
            const newPredictions = {};

            matchesList.forEach(m => {
                const isMatchLocked = new Date() >= new Date(m.time);
                if (isMatchLocked) {
                    newPredictions[m.id] = savedPredictions[m.id] || { s1: '', s2: '' };
                } else {
                    newPredictions[m.id] = { s1: '', s2: '' };
                }
            });

            inputs.forEach(input => {
                const matchId = input.getAttribute('data-match');
                const matchDef = matchesList.find(m => m.id === matchId);
                const isMatchLocked = matchDef && new Date() >= new Date(matchDef.time);
                if (!isMatchLocked) {
                    const team = input.getAttribute('data-team');
                    newPredictions[matchId][`s${team}`] = input.value;
                }
            });

            try {
                await setDoc(doc(db, "predicciones_ucl", user.uid), {
                    partidos: newPredictions,
                    ultima_actualizacion: new Date().toISOString()
                }, { merge: true });
                alert('¡Tus pronósticos de Semifinales UCL están guardados en la nube de La Remera EC!');
            } catch (err) {
                alert('Error al guardar: ' + err.message);
            } finally {
                savePredictionsBtn.textContent = 'Guardar Pronósticos';
                savePredictionsBtn.disabled = false;
            }
        };

        await loadLeaderboard();
    }

    // ===================================
    // Leaderboard & Live Updates
    // ===================================
    let hasLoadedUsers = false;
    let usersDataCache = {};
    let lastResultados = {};
    let lastPreds = {};
    let liveTickerIntervals = {};

    function updateLeaderboardLiveStatus() {
        const liveStatuses = ['1H', '2H', 'HT', 'ET', 'P', 'PEN'];
        const hasLive = Object.values(lastResultados).some(r => liveStatuses.includes(r.status));
        const timeStr = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const statusEl = document.getElementById('leaderboard-status');
        if (!statusEl) return;
        statusEl.innerHTML = hasLive
            ? `<span style="color:#22c55e; animation:pulse 2s infinite; font-size:0.7rem;">●</span>&ensp;<span style="color:#22c55e; font-weight:600;">Partidos en vivo</span>&ensp;·&ensp;Actualizado: <strong style="color:#fff;">${timeStr}</strong>`
            : `Tabla actualizada: <strong style="color:#fff;">${timeStr}</strong>`;
    }

    function updateLiveMatchesUI() {
        Object.values(liveTickerIntervals).forEach(id => clearInterval(id));
        liveTickerIntervals = {};

        matchesList.forEach(m => {
            const realData = lastResultados[m.id];
            if (realData) {
                const markerEl = document.getElementById(`liveMarker_${m.id}`);
                const scoreBox = document.getElementById(`realScoreBox_${m.id}`);
                const scoreVal = document.getElementById(`realScoreVal_${m.id}`);
                const scoreStatus = document.getElementById(`realScoreStatus_${m.id}`);

                const statusCode = realData.status;
                let estadoTxt = statusCode;
                let color = "#6cb4ee";
                let isLive = false;

                if (statusCode === "1H")       { estadoTxt = "1er Tiempo";    isLive = true; }
                else if (statusCode === "2H")   { estadoTxt = "2do Tiempo";    isLive = true; }
                else if (statusCode === "HT")   { estadoTxt = "⏸ Medio Tiempo"; isLive = true; }
                else if (statusCode === "ET")   { estadoTxt = "⏱ Tiempo Extra"; isLive = true; }
                else if (statusCode === "P")    { estadoTxt = "⚡ Penales";    isLive = true; }
                else if (["PEN","FT","AET"].includes(statusCode)) { estadoTxt = "✅ Finalizado"; color = "#22c55e"; }

                if (isLive) color = "#22c55e";

                const baseMinute = realData.minute ? parseInt(realData.minute) : null;
                const snapshotTime = Date.now();

                // Actualizar recuadro de resultado oficial
                if (scoreBox) {
                    scoreBox.style.display = 'block';
                    scoreBox.style.borderColor = isLive ? 'rgba(34,197,94,0.4)' : 'rgba(108,180,238,0.3)';
                }
                if (scoreVal) {
                    scoreVal.textContent = `${realData.s1} - ${realData.s2}`;
                    scoreVal.style.color = isLive ? '#22c55e' : '#fff';
                }

                const renderMarker = () => {
                    let minStr = '';
                    if (isLive && baseMinute !== null) {
                        const elapsed = Math.floor((Date.now() - snapshotTime) / 60000);
                        minStr = ` · ${baseMinute + elapsed}'`;
                    }
                    const statusFull = `${estadoTxt}${minStr}`;
                    if (scoreStatus) {
                        scoreStatus.textContent = statusFull;
                        scoreStatus.style.color = isLive ? '#22c55e' : '#9ca3af';
                        if (isLive) scoreStatus.style.animation = 'pulse 2s infinite';
                    }
                    if (markerEl) {
                        markerEl.innerHTML = isLive
                            ? `<span style="color:${color}; animation:pulse 2s infinite; font-size:0.85rem;">● En vivo ${minStr}</span>`
                            : '';
                    }
                };

                renderMarker();

                if (isLive && baseMinute !== null) {
                    liveTickerIntervals[m.id] = setInterval(() => {
                        renderMarker();
                        updateLeaderboardLiveStatus();
                    }, 30000);
                }
            }
        });
    }

    function renderLeaderboard() {
        let statusEl = document.getElementById('leaderboard-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'leaderboard-status';
            statusEl.style.cssText = 'text-align:center; margin-top:1rem; font-size:0.85rem; color:var(--text-muted); padding:0.4rem 1rem;';
            const glassDiv = document.querySelector('#leaderboard-container .glass');
            if (glassDiv) glassDiv.insertAdjacentElement('afterend', statusEl);
        }
        updateLeaderboardLiveStatus();

        const tableEl = document.querySelector('.leaderboard-table');
        if (tableEl) {
            tableEl.style.transition = 'opacity 0.25s';
            tableEl.style.opacity = '0.5';
            setTimeout(() => { tableEl.style.opacity = '1'; }, 250);
        }

        // Calculate points
        Object.keys(usersDataCache).forEach(uid => {
            usersDataCache[uid].pts = 0;
            const userPreds = lastPreds[uid];
            if (userPreds) {
                usersDataCache[uid].predicciones = userPreds;
                Object.keys(lastResultados).forEach(matchId => {
                    const real = lastResultados[matchId];
                    const pred = userPreds[matchId];
                    if (real && pred) {
                        const r1 = parseInt(real.s1);
                        const r2 = parseInt(real.s2);
                        const p1 = parseInt(pred.s1);
                        const p2 = parseInt(pred.s2);
                        if (!isNaN(r1) && !isNaN(r2) && !isNaN(p1) && !isNaN(p2)) {
                            if (p1 === r1 && p2 === r2) {
                                usersDataCache[uid].pts += 3;
                            } else {
                                const diffReal = r1 - r2;
                                const diffPred = p1 - p2;
                                const ganadorReal = diffReal > 0 ? 1 : (diffReal < 0 ? 2 : 0);
                                const ganadorPred = diffPred > 0 ? 1 : (diffPred < 0 ? 2 : 0);
                                if (ganadorReal === ganadorPred) {
                                    usersDataCache[uid].pts += 1;
                                }
                            }
                        }
                    }
                });
            }
        });

        const ranking = Object.values(usersDataCache).sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            return a.nombre.localeCompare(b.nombre);
        });
        const leaderboardBody = document.getElementById('leaderboard-body');
        leaderboardBody.innerHTML = '';

        if (ranking.length === 0) {
            leaderboardBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Aún no existen jugadores en la Polla Semifinales UCL.</td></tr>';
            return;
        }

        ranking.forEach((u, idx) => {
            const tr = document.createElement('tr');
            if (idx < 3) tr.className = 'top-3';
            const viewBtnHtml = `<button class="view-preds-btn" data-uid="${u.uid}" title="Auditar Pronósticos" style="width:72px; height:34px; font-size:0.85rem; border-radius:6px; border:1px solid #6cb4ee; background:rgba(0,86,162,0.15); color:#6cb4ee; cursor:pointer; transition:0.2s; display:inline-flex; align-items:center; justify-content:center; gap:4px; flex-shrink:0;">👁️ Ver</button>`;

            tr.innerHTML = `
                <td style="font-weight: bold; width: 60px; text-align: center;">${idx + 1}</td>
                <td style="font-weight: 500;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                        <span>${u.nombre}</span>
                        ${viewBtnHtml}
                    </div>
                </td>
                <td style="text-align: right; font-weight: 900; color: #6cb4ee; font-size: 1.15rem;">${u.pts}</td>
            `;
            leaderboardBody.appendChild(tr);
        });

        document.querySelectorAll('.view-preds-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const selectedUid = btn.getAttribute('data-uid');
                if (usersDataCache[selectedUid]) openViewerModal(usersDataCache[selectedUid]);
            });
        });
    }

    async function loadLeaderboard() {
        const leaderboardContainer = document.getElementById('leaderboard-container');
        leaderboardContainer.style.display = 'block';

        try {
            if (!hasLoadedUsers) {
                const usersSnap = await getDocs(collection(db, "usuarios"));
                usersSnap.forEach(userDoc => {
                    let nText = userDoc.data().nombre_completo || userDoc.data().nombre || "Competidor Anónimo";
                    nText = nText.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    usersDataCache[userDoc.id] = { uid: userDoc.id, nombre: nText, pts: 0, predicciones: {} };
                });
                hasLoadedUsers = true;
            }

            // Listener en tiempo real: resultados admin UCL
            onSnapshot(doc(db, "admin_ucl", "resultados"), (docSnap) => {
                if (docSnap.exists() && docSnap.data().partidos) {
                    lastResultados = docSnap.data().partidos;
                    updateLiveMatchesUI();
                }
                renderLeaderboard();
            });

            // Listener en tiempo real: predicciones UCL de usuarios
            onSnapshot(collection(db, "predicciones_ucl"), (querySnapshot) => {
                querySnapshot.forEach(predDoc => {
                    lastPreds[predDoc.id] = predDoc.data().partidos;
                });
                renderLeaderboard();
            });

        } catch (error) {
            console.error("Fallo al conectar listeners UCL: ", error);
            document.getElementById('leaderboard-body').innerHTML = '<tr><td colspan="3" style="text-align: center; color: #ff4444;">Error de conexión.</td></tr>';
        }
    }

    // ===================================
    // ADMIN PANEL — Resultados UCL
    // ===================================
    function openAdminPanel() {
        const existing = document.getElementById('adminResultsPanel');
        if (existing) { existing.remove(); return; }

        const STATUS_OPTIONS = [
            { val: '',    label: '— Estado —' },
            { val: '1H',  label: '⚽ 1er Tiempo' },
            { val: 'HT',  label: '⏸ Medio Tiempo' },
            { val: '2H',  label: '⚽ 2do Tiempo' },
            { val: 'ET',  label: '⏱ Tiempo Extra' },
            { val: 'P',   label: '🎯 Penales' },
            { val: 'FT',  label: '✅ Finalizado (FT)' },
            { val: 'AET', label: '✅ Final prórroga (AET)' },
        ];

        const rows = matchesList.map(m => {
            const saved = lastResultados[m.id] || {};
            const opts = STATUS_OPTIONS.map(o =>
                `<option value="${o.val}" ${saved.status === o.val ? 'selected' : ''} style="background:#0d1117;">${o.label}</option>`
            ).join('');
            return `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                <td style="padding:10px 8px; color:#e2e8f0; font-size:0.85rem; white-space:nowrap;">
                    <img src="${m.crest1}" style="width:18px; height:18px; vertical-align:middle; margin-right:4px; border-radius:50%;">${m.team1}
                    <span style="color:#64748b; margin:0 4px;">vs</span>
                    <img src="${m.crest2}" style="width:18px; height:18px; vertical-align:middle; margin-right:4px; border-radius:50%;">${m.team2}
                </td>
                <td style="padding:6px 4px; text-align:center;">
                    <input type="number" min="0" id="ar_s1_${m.id}" value="${saved.s1 ?? ''}" style="width:48px; text-align:center; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px; padding:5px; font-size:1rem; font-weight:700;">
                </td>
                <td style="padding:6px 2px; text-align:center; color:#64748b; font-weight:700;">—</td>
                <td style="padding:6px 4px; text-align:center;">
                    <input type="number" min="0" id="ar_s2_${m.id}" value="${saved.s2 ?? ''}" style="width:48px; text-align:center; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px; padding:5px; font-size:1rem; font-weight:700;">
                </td>
                <td style="padding:6px 4px;">
                    <select id="ar_st_${m.id}" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px; padding:5px 4px; font-size:0.8rem; width:100%;">${opts}</select>
                </td>
                <td style="padding:6px 4px; text-align:center;">
                    <input type="number" min="0" max="120" id="ar_mn_${m.id}" value="${saved.minute ?? ''}" placeholder="Min" style="width:52px; text-align:center; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px; padding:5px; font-size:0.9rem;">
                </td>
            </tr>`;
        }).join('');

        const panel = document.createElement('div');
        panel.id = 'adminResultsPanel';
        panel.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
        panel.innerHTML = `
            <div style="background:#0a0e17;border:1px solid rgba(0,86,162,0.45);border-radius:18px;padding:2rem;max-width:760px;width:96%;max-height:90vh;overflow-y:auto;">
                <h2 style="color:#6cb4ee;text-align:center;margin-bottom:0.3rem;font-size:1.5rem;">🛡️ Panel de Resultados Semifinales UCL</h2>
                <p style="text-align:center;color:#64748b;font-size:0.82rem;margin-bottom:0.3rem;">El bot actualiza automáticamente cada 5 minutos durante los partidos.</p>
                <p style="text-align:center;color:#64748b;font-size:0.78rem;margin-bottom:1.5rem;">Usa este panel solo para correcciones manuales si el bot falla.</p>
                <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;">
                    <thead><tr style="color:#64748b;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.5px;">
                        <th style="padding:6px 8px;text-align:left;">Partido</th>
                        <th style="padding:6px 4px;text-align:center;">Local</th>
                        <th></th>
                        <th style="padding:6px 4px;text-align:center;">Visita</th>
                        <th style="padding:6px 4px;text-align:center;">Estado</th>
                        <th style="padding:6px 4px;text-align:center;">Min.</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                </div>
                <div style="text-align:center;margin-top:1.8rem;display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
                    <button id="arSaveBtn" style="background:linear-gradient(135deg,#0056a2,#1a73c7);color:#fff;border:none;padding:0.75rem 2.2rem;border-radius:8px;font-weight:800;cursor:pointer;font-size:1rem;">💾 Guardar en Firebase</button>
                    <button id="arExportBtn" style="background:linear-gradient(135deg,#166534,#16a34a);color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.95rem;">📥 Exportar Inscritos CSV</button>
                    <button id="arCloseBtn" style="background:transparent;color:#9ca3af;border:1px solid rgba(255,255,255,0.15);padding:0.75rem 1.5rem;border-radius:8px;cursor:pointer;">Cerrar</button>
                </div>
                <p id="arMsg" style="text-align:center;margin-top:1rem;font-size:0.88rem;min-height:1.2rem;"></p>
            </div>`;

        document.body.appendChild(panel);

        document.getElementById('arCloseBtn').onclick = () => panel.remove();
        panel.addEventListener('click', e => { if (e.target === panel) panel.remove(); });

        document.getElementById('arExportBtn').onclick = async () => {
            const btn = document.getElementById('arExportBtn');
            btn.textContent = '⏳ Exportando...';
            btn.disabled = true;
            try {
                // Cargar SheetJS dinámicamente
                if (!window.XLSX) {
                    await new Promise((resolve, reject) => {
                        const s = document.createElement('script');
                        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                        s.onload = resolve; s.onerror = reject;
                        document.head.appendChild(s);
                    });
                }
                const usersSnap = await getDocs(collection(db, "usuarios"));
                const rows = [['Nombre', 'Email', 'Teléfono', 'Ciudad', 'Provincia', 'Equipo Ecuador', 'Equipo Internacional', 'Es Ecuatoriano', 'Fecha Registro']];
                usersSnap.forEach(d => {
                    const u = d.data();
                    let tel = String(u.telefono || '');
                    if (tel && !tel.startsWith('0') && tel.length === 9) tel = '0' + tel;
                    rows.push([
                        u.nombre_completo || '',
                        u.email || '',
                        tel,
                        u.ciudad || '',
                        u.provincia || '',
                        u.equipo_ecuador || '',
                        u.equipo_internacional || '',
                        u.es_de_ecuador ? 'Sí' : 'No',
                        u.fecha_registro ? u.fecha_registro.split('T')[0] : ''
                    ]);
                });

                const wb = window.XLSX.utils.book_new();
                const ws = window.XLSX.utils.aoa_to_sheet(rows);

                // Forzar columna Teléfono (col C) como texto
                rows.forEach((row, i) => {
                    if (i === 0) return;
                    const cellRef = window.XLSX.utils.encode_cell({ r: i, c: 2 });
                    ws[cellRef] = { v: row[2], t: 's' }; // t:'s' = string
                });

                // Ancho de columnas
                ws['!cols'] = [{ wch: 30 }, { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];

                window.XLSX.utils.book_append_sheet(wb, ws, 'Inscritos UCL');
                const fecha = new Date().toISOString().split('T')[0];
                window.XLSX.writeFile(wb, `inscritos_ucl_${fecha}.xlsx`);

            } catch(e) {
                alert('Error al exportar: ' + e.message);
            } finally {
                btn.textContent = '📥 Exportar Inscritos Excel';
                btn.disabled = false;
            }
        };

        document.getElementById('arSaveBtn').onclick = async () => {
            const btn = document.getElementById('arSaveBtn');
            const msg = document.getElementById('arMsg');
            btn.textContent = '⏳ Guardando...';
            btn.disabled = true;

            const updates = {};
            matchesList.forEach(m => {
                const s1 = document.getElementById(`ar_s1_${m.id}`).value.trim();
                const s2 = document.getElementById(`ar_s2_${m.id}`).value.trim();
                const status = document.getElementById(`ar_st_${m.id}`).value;
                const minute = document.getElementById(`ar_mn_${m.id}`).value.trim();
                if (s1 !== '' && s2 !== '' && status !== '') {
                    updates[m.id] = { s1, s2, status, minute: minute || null };
                }
            });

            try {
                await setDoc(doc(db, "admin_ucl", "resultados"), {
                    partidos: updates,
                    ultima_sincronizacion: new Date().toISOString()
                });
                msg.style.color = '#22c55e';
                msg.textContent = `✅ ${Object.keys(updates).length} partido(s) guardados. Tabla se actualiza automáticamente.`;
            } catch (e) {
                msg.style.color = '#ff4444';
                msg.textContent = '❌ Error: ' + e.message;
            } finally {
                btn.textContent = '💾 Guardar en Firebase';
                btn.disabled = false;
            }
        };
    }

    // Admin access via double-click logo
    const logoElAdmin = document.querySelector('.logo');
    if (logoElAdmin) {
        logoElAdmin.addEventListener('dblclick', () => {
            const pwd = prompt('🔑 Código de Administrador:');
            if (pwd === 'CarlosPancho') {
                openAdminPanel();
            } else if (pwd !== null) {
                alert('Clave incorrecta. Acceso denegado.');
            }
        });
    }

});
