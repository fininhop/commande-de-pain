// /api/save-order.js

const firebaseConfig = {
    // Si vous utilisez Next.js/React, vous utilisez process.env
    // Sinon, si c'est un simple HTML/JS hébergé sur Vercel, vous devrez 
    // peut-être utiliser des scripts d'injection ou une fonction de Vercel. 
    // Pour une application simple, la structure de Next.js est la plus courante :
    
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

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
