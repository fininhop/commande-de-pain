// api/orders.js
// Unified endpoint for all order operations

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
        global.ordersAdminInitError = null;
    } catch (e) {
        console.error('Erreur initialisation Admin SDK (orders):', e.message);
        global.ordersAdminInitError = e;
    }
} else {
    global.db = admin.firestore();
}

const db = global.db;
const { sendMail } = require('./_mailer');

function orderToSummary(order, orderId){
    const total = (order.items||[]).reduce((s,it)=> s + (Number(it.price||0)*Number(it.quantity||0)), 0);
    const lines = (order.items||[]).map(it => `${it.quantity} x ${it.name} (€${Number(it.price||0).toFixed(2)})`).join('\n');
    return `Commande ${orderId}\nClient: ${order.name} <${order.email}> ${order.phone?('('+order.phone+')'):''}\nDate de retrait: ${order.date || order.seasonEndDate || ''}\nSaison: ${order.seasonName || order.seasonId || ''}\nTotal: €${total.toFixed(2)}\n\nArticles:\n${lines}`;
}

module.exports = async (req, res) => {
    if (global.ordersAdminInitError || !db) {
        return res.status(500).json({ message: 'Erreur de configuration serveur (Firebase).', error: (global.ordersAdminInitError && global.ordersAdminInitError.message) || 'Firestore non initialisé' });
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
            // Two modes:
            // 1) Create order when body contains items
            // 2) User cancellation when body contains orderId and email and no items
            const { name, email, phone, date, seasonId, seasonName, items } = req.body || {};
            if (req.body && req.body.orderId && !items) {
                // User cancellation flow (requires email ownership and 48h rule)
                const { orderId } = req.body;
                if (!orderId || !email) return res.status(400).json({ message: 'orderId et email requis pour annulation' });
                const docRef = db.collection('orders').doc(String(orderId));
                const snap = await docRef.get();
                if (!snap.exists) return res.status(404).json({ message: 'Commande introuvable' });
                const order = snap.data();
                const ownerEmail = String(order.email||'').toLowerCase();
                if (ownerEmail !== String(email||'').toLowerCase()) return res.status(403).json({ message: 'Vous ne pouvez annuler que vos propres commandes' });
                const endDateStr = order.date || order.seasonEndDate;
                if (!endDateStr) return res.status(400).json({ message: 'Date de fin de saison inconnue' });
                const now = Date.now();
                const end = new Date(endDateStr).getTime();
                const diffHours = (end - now) / (1000*60*60);
                if (diffHours < 48) return res.status(400).json({ message: 'Annulation impossible: moins de 48h avant la fin de la saison' });

                await docRef.delete();

                // Send emails: admin info + user confirmation (best-effort)
                const adminEmail = process.env.ADMIN_EMAIL || process.env.MAIL_TO_ADMIN;
                const siteName = process.env.SITE_NAME || 'Commande de Pain';
                const summary = orderToSummary(order, orderId);
                try {
                    if (adminEmail) {
                        await sendMail({
                            to: adminEmail,
                            subject: `[${siteName}] Commande supprimée par l'utilisateur (${order.name})`,
                            text: summary
                        });
                    }
                } catch(e){ console.error('Mail admin (annulation utilisateur) échoué:', e.message); }
                try {
                    await sendMail({
                        to: ownerEmail,
                        subject: `[${siteName}] Confirmation d'annulation de votre commande`,
                        text: `Bonjour ${order.name},\n\nVotre commande a bien été annulée.\n\n${summary}\n\nCordialement.`
                    });
                } catch(e){ console.error('Mail utilisateur (annulation) échoué:', e.message); }

                return res.status(200).json({ ok: true, orderId });
            }
            // POST /api/orders (create order)
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
            const { message } = req.body || {};
            if (!orderId) return res.status(400).json({ message: 'orderId requis' });
            const ref = db.collection('orders').doc(orderId);
            const snap = await ref.get();
            if (!snap.exists) return res.status(404).json({ message: 'Commande introuvable' });
            const order = snap.data();
            await ref.delete();
            // Notify user with customizable message
            const siteName = process.env.SITE_NAME || 'Commande de Pain';
            const userEmail = String(order.email||'').toLowerCase();
            const adminMsg = (typeof message === 'string' ? message.trim() : '');
            const summary = orderToSummary(order, orderId);
            try {
                if (userEmail) {
                    await sendMail({
                        to: userEmail,
                        subject: `[${siteName}] Votre commande a été annulée`,
                        text: `Bonjour ${order.name},\n\nVotre commande a été annulée par l'administrateur.${adminMsg ? `\n\nMessage: ${adminMsg}\n` : '\n'}\n${summary}\n\nCordialement.`
                    });
                }
            } catch(e){ console.error('Mail utilisateur (annulation admin) échoué:', e.message); }
            return res.status(200).json({ message: 'Commande supprimée', orderId });
        }
        return res.status(405).json({ message: 'Method Not Allowed' });
    } catch (error) {
        console.error('Erreur orders:', error);
        return res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};
