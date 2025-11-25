// =======================================================
// FICHIER : api/get-orders.js (CODE SERVEUR VERCEL)
// Gère la récupération des commandes Firestore pour le gestionnaire.
// =======================================================

const admin = require('firebase-admin');
let db; // Déclarer db ici pour la portée globale

// Bloc d'initialisation de l'Admin SDK
if (!admin.apps.length) {
    try {
        // La variable d'environnement doit être le JSON de la clé de service
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT); 
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        // Initialiser db après l'application
        db = admin.firestore(); 
        
    } catch (e) {
        console.error("Erreur CRITIQUE d'initialisation Admin SDK:", e.message);
        // Stocker l'erreur pour la gestion dans le module.exports
        global.adminInitError = e; 
    }
} else {
    // Si l'application existe déjà, récupérer son instance de db
    db = admin.firestore();
}

// Utilisation du format Vercel pour l'exportation
module.exports = async (req, res) => {
    // Si une erreur d'initialisation critique s'est produite
    if (global.adminInitError) {
        return res.status(500).json({ 
            message: 'Erreur de configuration serveur. Clé de service Firebase invalide.',
            error: global.adminInitError.message
        });
    }
    
    // Vérification de la méthode
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // CORRECTION 1: Utiliser le champ 'timestamp' ou 'date' pour le tri, 
        // selon le champ que vous utilisez lors de la soumission de commande.
        // J'utilise 'timestamp' si vous le définissez côté serveur (recommandé).
        const snapshot = await db.collection('orders')
            .orderBy('timestamp', 'desc') // Changez 'timestamp' si vous utilisez un autre champ (ex: 'date')
            .get();

        const orders = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || 'N/A',
                email: data.email || 'N/A',
                phone: data.phone || 'N/A',
                date: data.date,
                renouveler: data.renouveler,
                items: data.items,
                // CORRECTION 2: S'assurer que le champ existe avant d'appeler .toDate()
                timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null,
                // On garde également la date de livraison simple si elle est présente
                orderDate: data.date 
            };
        });

        res.status(200).json({ orders });

    } catch (error) {
        console.error('Erreur de récupération Firestore (GET):', error);
        res.status(500).json({ 
            message: 'Erreur interne du serveur lors de la récupération des commandes.',
            error: error.message 
        });
    }
};
