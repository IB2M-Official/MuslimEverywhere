document.addEventListener('DOMContentLoaded', () => {
    const adhanAudio = document.getElementById('adhanAudio');
    const muteButton = document.getElementById('muteButton');
    const adhanSelector = document.getElementById('adhanSelector');
    const playPauseAdhanButton = document.getElementById('playPauseAdhanButton');

    // Charger les paramètres de localisation précédemment sélectionnés
    const city = localStorage.getItem('city');
    const country = localStorage.getItem('country');
    const convention = localStorage.getItem('convention');

    if (city && country && convention) {
        afficherHeuresDePriere(city, country, convention);
    }

    // Autres écouteurs d'événements et initialisations
    document.getElementById('locateMe').addEventListener('click', obtenirPosition);

    document.getElementById('enterManually').addEventListener('click', () => {
        document.getElementById('manualEntryForm').style.display = 'block';
        document.getElementById('overlay').style.display = 'block';
    });

    document.querySelector('#manualEntryForm .close-btn').addEventListener('click', () => {
        document.getElementById('manualEntryForm').style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
    });

    document.getElementById('prayerForm').addEventListener('submit', handleSubmit);

    document.getElementById('settingsButton').addEventListener('click', () => {
        document.getElementById('settingsPopup').style.display = 'block';
        document.getElementById('overlay').style.display = 'block';
    });

    document.querySelector('#settingsPopup .button-container button:nth-of-type(1)').addEventListener('click', saveSettings);
    document.querySelector('#settingsPopup .button-container button:nth-of-type(3)').addEventListener('click', closeSettings);
});

function toggleMute() {
    const adhanAudio = document.getElementById('adhanAudio');
    const isCurrentlyMuted = adhanAudio.muted;

    // Inverser l'état muet
    adhanAudio.muted = !isCurrentlyMuted;

    // Mettre à jour le localStorage
    localStorage.setItem('adhanEnabled', JSON.stringify(!isCurrentlyMuted));

    // Mettre à jour l'icône du bouton
    updateMuteButtonIcon(!isCurrentlyMuted);

    location.reload();
}

function updateMuteButtonIcon(isEnabled) {
    const muteButton = document.getElementById('muteButton');
    muteButton.textContent = isEnabled ? '🔊' : '🔇';
}

function saveSettings() {
    const selectedAdhan = document.getElementById('adhanSelector').value;
    const adhanAudio = document.getElementById('adhanAudio');

    // Enregistrer l'Adhan sélectionné dans le localStorage
    localStorage.setItem('selectedAdhan', selectedAdhan);

    // Mettre à jour la source de l'audio
    adhanAudio.src = selectedAdhan;

    // Remettre à zéro la lecture de l'audio
    adhanAudio.pause();
    adhanAudio.currentTime = 0;

    // Mettre à jour le texte du bouton play/pause
    //document.getElementById('playPauseAdhanButton').textContent = 'Écouter l\'Adhan'; //suppression car 2boutons play/pause

    //closeSettings();
}

function closeSettings() {
    adhanAudio.pause();
    document.getElementById('settingsPopup').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}

function loadPrayerTimes() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const ville = localStorage.getItem("city") || "defaultCity";
    const pays = localStorage.getItem("country") || "defaultCountry";
    const convention = localStorage.getItem("convention") || "2";
    const storageKey = `${ville}-${pays}-${month}-${year}`;

    // Check if offline and data exists in localStorage
    if (!navigator.onLine && localStorage.getItem(storageKey)) {
        const storedData = JSON.parse(localStorage.getItem(storageKey));
        displayPrayerTimes(storedData);
        alert("Mode hors ligne activé : affichage des données enregistrées.");
    } else {
        fetchPrayerTimesOnline(ville, pays, convention, storageKey);
    }
}

function fetchPrayerTimesOnline(ville, pays, convention, storageKey) {
    const apiURL = `https://api.aladhan.com/v1/timingsByCity?city=${ville}&country=${pays}&method=${convention}`;
    
    fetch(apiURL)
        .then(response => response.json())
        .then(data => {
            if (data && data.data && data.data.timings) {
                const timings = data.data.timings;
                localStorage.setItem(storageKey, JSON.stringify({ ville, pays, timings, month: now.getMonth() + 1, year: now.getFullYear() }));
                displayPrayerTimes({ ville, pays, timings });
            } else {
                console.error("Erreur : Données de prière incorrectes.");
            }
        })
        .catch(error => console.error("Erreur lors de la récupération des données : ", error));
}

function displayPrayerTimes(data) {
    const { ville, pays, timings } = data;
    const jours = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const now = new Date();
    const jour = jours[now.getDay()];
    const date = jour === "Vendredi" ? "Jumua" : jour + " " + now.toLocaleDateString();

    const prayerTimes = `
        <h2>Horaires pour ${ville}, ${pays}</h2>
        <p id="countdown"></p>
        <p>Fajr: ${timings.Fajr}</p>
        <p>Dhuhr: ${timings.Dhuhr}</p>
        <p>Asr: ${timings.Asr}</p>
        <p>Maghrib: ${timings.Maghrib}</p>
        <p>Isha: ${timings.Isha}</p>
    `;
    document.getElementById("prayerTimes").innerHTML = prayerTimes;
    afficherTempsRestant(timings);
    updateCurrentDate();
    updateCurrentTime();
}

function updateCurrentDate() {
    const now = new Date();
    const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const day = days[now.getDay()];
    const dateStr = `${day}, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    document.getElementById("currentDate").textContent = dateStr;
}

function updateCurrentTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    document.getElementById("currentTime").textContent = timeStr;
    setTimeout(updateCurrentTime, 1000);
}

function afficherTempsRestant(timings) {
    const nextPrayer = getNextPrayer(timings);
    if (nextPrayer) {
        const updateCountdown = () => {
            const timeRemaining = calculerTempsRestant(nextPrayer.time);
            document.getElementById("countdown").textContent = `${nextPrayer.name} dans: ${timeRemaining}`;
        };
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }
}

function calculerTempsRestant(timing) {
    const now = new Date();
    const prayerTime = new Date(now.toDateString() + " " + timing);

    let diff = (prayerTime - now) / 1000;
    if (diff < 0) {
        diff += 24 * 3600;
    }
    const hours = Math.floor(diff / 3600);
    diff %= 3600;
    const minutes = Math.floor(diff / 60);
    const seconds = Math.floor(diff % 60);

    return `${hours}h ${minutes} min ${seconds}s`;
}

function getNextPrayer(timings) {
    const now = new Date();
    const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    for (const prayer of prayers) {
        const prayerTime = new Date(now.toDateString() + " " + timings[prayer]);
        if (prayerTime > now) {
            return { name: prayer, time: timings[prayer] };
        }
    }
    return { name: "Fajr", time: timings["Fajr"] }; // Return Fajr for the next day
}

// Load prayer times on page load
window.addEventListener("load", loadPrayerTimes);
window.addEventListener("offline", () => alert("Vous êtes hors ligne, basculement en mode hors ligne."));
window.addEventListener("online", () => alert("Vous êtes en ligne, rafraîchissez pour mettre à jour les données."));
