// /api/get-orders.js

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
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // Récupérer les commandes triées par date de création (la plus récente d'abord)
        const snapshot = await db.collection('orders')
            .orderBy('createdAt', 'desc')
            .get();

        const orders = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                email: data.email,
                phone: data.phone, // Ajout du téléphone
                date: data.date,
                renouveler: data.renouveler, // Ajout du renouvellement
                items: data.items,
                // Convertir le timestamp Firestore en chaîne ISO si disponible
                createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
            };
        });

        res.status(200).json({ orders });

    } catch (error) {
        console.error('Erreur Firestore:', error);
        res.status(500).json({ 
            message: 'Erreur interne du serveur lors de la récupération des commandes.',
            error: error.message 
        });
    }
};
