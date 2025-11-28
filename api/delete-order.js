// =======================================================
// FICHIER : api/delete-order.js (CODE SERVEUR VERCEL)
// Gère la suppression d'une commande Firestore
// =======================================================

const admin = require('firebase-admin');

// Initialisation de l'Admin SDK : seulement s'il n'est pas déjà initialisé
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        global.db = admin.firestore();
    } catch (e) {
        console.error("Erreur CRITIQUE d'initialisation Admin SDK:", e.message);
        global.adminInitError = e;
    }
} else {
    global.db = admin.firestore();
}

// Le gestionnaire de la fonction Serverless Vercel
module.exports = async (req, res) => {
    // Vérification de l'erreur d'initialisation
    if (global.adminInitError) {
        return res.status(500).json({
            message: 'Erreur de configuration serveur. Clé de service Firebase invalide.',
            error: global.adminInitError.message
        });
    }

    // Méthode requise
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { orderId, email } = req.body || {};

        // Validation
        if (!orderId) {
            return res.status(400).json({ message: 'ID de commande requis' });
        }

        const provided = req.headers['x-admin-token'] || req.query.adminToken || null;
        const expected = process.env.ADMIN_TOKEN || null;
        const isAdmin = expected && provided === expected;

        const docRef = global.db.collection('orders').doc(String(orderId));
        const snap = await docRef.get();
        if (!snap.exists) {
            return res.status(404).json({ message: 'Commande introuvable' });
        }
        const order = snap.data();

        if (!isAdmin) {
            // Chemin utilisateur: ownership et règle des 48h
            if (!email) return res.status(400).json({ message: 'Email requis pour annulation utilisateur' });
            const ownerEmail = String(order.email || '').toLowerCase();
            if (ownerEmail !== String(email || '').toLowerCase()) {
                return res.status(403).json({ message: 'Vous ne pouvez annuler que vos propres commandes' });
            }
            const endDateStr = order.date || order.seasonEndDate;
            if (!endDateStr) return res.status(400).json({ message: 'Date de fin de saison inconnue' });
            const now = Date.now();
            const end = new Date(endDateStr).getTime();
            const diffHours = (end - now) / (1000*60*60);
            if (diffHours < 48) return res.status(400).json({ message: 'Annulation impossible: moins de 48h avant la fin de la saison' });
        }

        await docRef.delete();
        res.status(200).json({ ok: true, orderId });

    } catch (error) {
        console.error('Erreur de suppression Firestore:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la suppression de la commande.', error: error.message });
    }
};
