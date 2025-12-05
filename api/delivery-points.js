// api/delivery-points.js
// CRUD API for delivery points (villes)

const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT manquante');
        const serviceAccount = JSON.parse(raw);
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        global.db = admin.firestore();
        global.deliveryAdminInitError = null;
    } catch (e) {
        console.error('Erreur initialisation Admin SDK (delivery-points):', e.message);
        global.deliveryAdminInitError = e;
    }
} else {
    global.db = admin.firestore();
}

const db = global.db;

module.exports = async (req, res) => {
    if (global.deliveryAdminInitError || !db) {
        return res.status(500).json({ message: 'Erreur de configuration serveur (Firebase).', error: (global.deliveryAdminInitError && global.deliveryAdminInitError.message) || 'Firestore non initialisé' });
    }

    const method = req.method;
    let body = req.body || {};
    // Fallback pour Vercel: parser le body si vide et POST/PATCH
    if ((method === 'POST' || method === 'PATCH') && (!body || Object.keys(body).length === 0)) {
        try {
            body = JSON.parse(req.rawBody || '{}');
        } catch (e) {
            console.error('Erreur parsing rawBody:', e.message);
        }
    }
    console.log('[delivery-points] Body reçu:', body);
    const { id, name, city, address, info } = body;
    const adminToken = req.headers['x-admin-token'] || req.query.adminToken || null;
    const expectedAdmin = process.env.ADMIN_TOKEN || null;
    const isAdmin = expectedAdmin && adminToken === expectedAdmin;

    try {
        if (method === 'GET') {
            // GET /api/delivery-points: list all delivery points
            const snap = await db.collection('deliveryPoints').get();
            const points = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            return res.status(200).json({ points });
        }
        if (method === 'POST') {
            // POST /api/delivery-points: create new delivery point (admin only)
            console.log('[delivery-points] Champs reçus:', { name, city, address, info });
            if (!isAdmin) return res.status(401).json({ message: 'Admin token requis' });
            if (!name || !city || !address) {
                return res.status(400).json({ message: 'Nom, ville et adresse requis' });
            }
            const data = { name, city, address, info: info || '', createdAt: admin.firestore.FieldValue.serverTimestamp() };
            const docRef = await db.collection('deliveryPoints').add(data);
            return res.status(201).json({ message: 'Point de livraison créé', id: docRef.id });
        }
        if (method === 'PATCH') {
            // PATCH /api/delivery-points: update delivery point (admin only)
            if (!isAdmin) return res.status(401).json({ message: 'Admin token requis' });
            if (!id) return res.status(400).json({ message: 'ID requis' });
            const updates = {};
            if (name) updates.name = name;
            if (city) updates.city = city;
            if (address) updates.address = address;
            if (info) updates.info = info;
            await db.collection('deliveryPoints').doc(id).update(updates);
            return res.status(200).json({ message: 'Point de livraison mis à jour', id, updates });
        }
        if (method === 'DELETE') {
            // DELETE /api/delivery-points: delete delivery point (admin only)
            if (!isAdmin) return res.status(401).json({ message: 'Admin token requis' });
            if (!id) return res.status(400).json({ message: 'ID requis' });
            await db.collection('deliveryPoints').doc(id).delete();
            return res.status(200).json({ message: 'Point de livraison supprimé', id });
        }
        return res.status(405).json({ message: 'Method Not Allowed' });
    } catch (error) {
        console.error('[delivery-points] Erreur Firestore:', error);
        return res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};
