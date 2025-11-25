// =======================================================
// FICHIER : script-gestionnaire.js
// Gère l'affichage des commandes récupérées via l'API Vercel /api/get-orders
// =======================================================

// --- 1. CONFIGURATION FIREBASE ET INITIALISATION ---

// NOTE : firebaseConfig est défini dans config.js

let db;
let ordersCollection;

// VÉRIFICATION CRUCIALE : Initialiser UNIQUEMENT si l'application par défaut n'existe pas.
if (!firebase.apps.length) {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase initialisé avec succès.");
    } catch (error) {
        console.error("Erreur lors de l'initialisation de Firebase:", error);
    }
} else {
    // Si l'application existe déjà, on utilise l'instance par défaut.
    console.log("Firebase App [DEFAULT] déjà existante.");
}

// Assurez-vous d'initialiser Firestore seulement APRÈS que l'application soit prête
try {
    // Récupère l'instance de Firestore de l'application (qu'elle soit nouvelle ou existante)
    db = firebase.firestore();
    ordersCollection = db.collection("orders"); 
} catch (error) {
    console.error("Erreur lors de l'initialisation de Firestore:", error);
}

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Rendre la fonction accessible globalement pour le bouton "Actualiser"
window.fetchOrders = async function() {
    const ordersTableBody = document.getElementById('ordersTableBody');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    
    // Fonction pour le formatage de la date/heure
    function formatDateTime(isoString) {
        try {
            if (!isoString) return 'N/A';
            const date = new Date(isoString);
            const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            return date.toLocaleDateString('fr-FR', options);
        } catch (e) {
            return isoString;
        }
    }

    loadingMessage.textContent = 'Chargement des commandes...';
    ordersTableBody.innerHTML = '';
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');

    try {
        const response = await fetch('/api/get-orders');

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || `Erreur HTTP ${response.status}`);
        }

        const result = await response.json();
        const orders = result.orders;

        loadingMessage.textContent = '';

        if (orders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="6">Aucune commande trouvée.</td></tr>';
            return;
        }

        // Construction du tableau HTML
        orders.forEach(order => {
            const row = ordersTableBody.insertRow();
            
            // Formatage de la liste des articles
            const itemsList = `<ul class="items-list">${order.items.map(item => 
                `<li><strong>${item.quantity}</strong> x ${item.name}</li>`
            ).join('')}</ul>`;

            row.insertCell(0).textContent = formatDateTime(order.createdAt);
            row.insertCell(1).textContent = order.name;
            // Combinaison Email et Téléphone
            row.insertCell(2).innerHTML = `Email: ${order.email}<br>Tél: ${order.phone || 'N/A'}`; 
            row.insertCell(3).textContent = order.date;
            row.insertCell(4).textContent = order.renouveler === 'oui' ? '✅ Oui' : '❌ Non';
            row.insertCell(5).innerHTML = itemsList;
        });

    } catch (error) {
        console.error('Erreur de connexion à l\'API:', error);
        loadingMessage.textContent = '';
        errorMessage.textContent = `Échec de la récupération des commandes : ${error.message}. Vérifiez les variables d'environnement Vercel/Firebase.`;
        errorMessage.classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchOrders();
});
