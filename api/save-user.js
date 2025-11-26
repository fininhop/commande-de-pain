// /api/save-user.js

const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (e) {
        console.error('Erreur initialisation Admin SDK (save-user):', e.message);
    }
}

const db = admin.firestore();

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { name, email, phone, address, passwordHash } = req.body;
        if (!name || !email || !passwordHash) {
            return res.status(400).json({ message: 'Nom, email et mot de passe requis' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        // Recherche si l'email existe déjà
        const existing = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
        if (!existing.empty) {
            return res.status(409).json({ message: 'Cet email est déjà enregistré' });
        }

        const userData = {
            name: name.trim(),
            email: normalizedEmail,
            phone: phone ? String(phone).trim() : '',
            address: address ? String(address).trim() : '',
            passwordHash: passwordHash, // Stocker le hash du mot de passe
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const ref = await db.collection('users').add(userData);
        res.status(201).json({ message: 'Utilisateur enregistré', userId: ref.id, user: userData });

    } catch (error) {
        console.error('Erreur save-user:', error);
        res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement', error: error.message });
    }
};
