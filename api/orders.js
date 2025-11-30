// api/orders.js
// Unified endpoint for all order operations

const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\n/g, '\n');
        }
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        global.db = admin.firestore();
    } catch (e) {
        console.error('Erreur initialisation Admin SDK (orders):', e.message);
        global.adminInitError = e;
    }
} else {
    global.db = admin.firestore();
}

const db = global.db;

module.exports = async (req, res) => {
    if (global.adminInitError) {
        return res.status(500).json({ message: 'Erreur de configuration serveur.', error: global.adminInitError.message });
    }

    const method = req.method;
    const { userId, orderId, updates } = req.body || {};
    const adminToken = req.headers['x-admin-token'] || req.query.adminToken || null;
    const expectedAdmin = process.env.ADMIN_TOKEN || null;
    const isAdmin = expectedAdmin && adminToken === expectedAdmin;

    try {
        if (method === 'GET') {
            // GET /api/orders or /api/orders?userId=...
            if (userId) {
                // Get orders for a user
                const snapshot = await db.collection('orders').where('userId', '==', userId).get();
                const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                return res.status(200).json({ orders });
            } else {
                // Get all orders (admin only)
                if (!isAdmin) return res.status(401).json({ message: 'Admin token requis' });
                const snapshot = await db.collection('orders').get();
                const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                return res.status(200).json({ orders });
            }
        }
        if (method === 'POST') {
            // POST /api/orders (create order)
            const { name, email, phone, date, seasonId, seasonName, items } = req.body;
            if (!name || !email || (!date && !seasonId) || !items || items.length === 0) {
                return res.status(400).json({ message: 'Données de commande incomplètes.' });
            }
            // Optionally check for season existence
            const seasonsSnap = await db.collection('seasons').limit(1).get();
            if (seasonsSnap.empty) {
                return res.status(503).json({ message: 'Aucune saison créée.' });
            }
            const orderData = {
                name: (name || '').toString().trim(),
                email: (email || '').toString().trim().toLowerCase(),
                phone: (phone || '').toString().trim(),
                date: (date || '').toString().trim(),
                seasonId: seasonId || null,
                seasonName: seasonName || null,
                items: items.map(item => ({ ...item })),
                userId: userId || null,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
            const docRef = await db.collection('orders').add(orderData);
            return res.status(201).json({ message: 'Commande enregistrée', orderId: docRef.id });
        }
        if (method === 'PATCH') {
            // PATCH /api/orders (update order)
            if (!isAdmin) return res.status(401).json({ message: 'Admin token requis' });
            if (!orderId || !updates || typeof updates !== 'object') {
                return res.status(400).json({ message: 'orderId et updates requis' });
            }
            const forbidden = ['userId'];
            forbidden.forEach(f => delete updates[f]);
            if (typeof updates.date !== 'undefined') {
                updates.date = (updates.date || '').toString().trim();
            }
            await db.collection('orders').doc(orderId).update(updates);
            return res.status(200).json({ message: 'Commande mise à jour', orderId, updates });
        }
        if (method === 'DELETE') {
            // DELETE /api/orders (delete order)
            if (!isAdmin) return res.status(401).json({ message: 'Admin token requis' });
            if (!orderId) return res.status(400).json({ message: 'orderId requis' });
            await db.collection('orders').doc(orderId).delete();
            return res.status(200).json({ message: 'Commande supprimée', orderId });
        }
        return res.status(405).json({ message: 'Method Not Allowed' });
    } catch (error) {
        console.error('Erreur orders:', error);
        return res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};
