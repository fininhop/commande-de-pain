// /api/save-order.js

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

const admin = require('firebase-admin');

// Vérifiez si l'application Firebase est déjà initialisée
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { name, email, phone, date, renouveler, items } = req.body;
        
        // Vérification minimale des données
        if (!name || !email || !date || !items || items.length === 0) {
            return res.status(400).json({ message: 'Données de commande incomplètes.' });
        }

        const orderData = {
            name,
            email,
            phone,
            date: date, // Date de retrait/livraison souhaitée
            renouveler: renouveler,
            items: items.map(item => ({
                name: item.name,
                quantity: item.quantity
                // Le prix n'est pas stocké pour éviter les incohérences si le prix change
            })),
            createdAt: admin.firestore.FieldValue.serverTimestamp(), // Date d'enregistrement dans Firestore
        };

        const docRef = await db.collection('orders').add(orderData);

        res.status(201).json({ 
            message: 'Commande enregistrée avec succès', 
            orderId: docRef.id 
        });

    } catch (error) {
        console.error('Erreur Firestore:', error);
        res.status(500).json({ 
            message: 'Erreur interne du serveur lors de l\'enregistrement de la commande.',
            error: error.message 
        });
    }
};
