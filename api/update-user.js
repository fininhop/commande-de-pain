// /api/update-user.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch (e) {
    console.error('Erreur initialisation Admin SDK (update-user):', e.message);
  }
}
const db = admin.firestore();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée' });
  const { userId, name, phone, currentPassword, newPassword } = req.body || {};
  if (!userId) return res.status(400).json({ message: 'userId requis' });

  // Branche changement de mot de passe si les champs sont fournis
  if (currentPassword && newPassword) {
    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' });
    }
    try {
      const userRef = db.collection('users').doc(userId);
      const snap = await userRef.get();
      if (!snap.exists) return res.status(404).json({ message: 'Utilisateur introuvable' });
      const data = snap.data();
      const bcrypt = require('bcryptjs');
      const matches = await bcrypt.compare(currentPassword, data.passwordHash);
      if (!matches) return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
      const newHash = await bcrypt.hash(newPassword, 10);
      await userRef.update({ passwordHash: newHash, passwordChangedAt: admin.firestore.FieldValue.serverTimestamp() });
      return res.status(200).json({ message: 'Mot de passe mis à jour' });
    } catch (err) {
      console.error('Erreur changement mot de passe (update-user):', err);
      return res.status(500).json({ message: 'Erreur serveur lors du changement de mot de passe', error: err.message });
    }
  }

  // Sinon mise à jour profil (nom / téléphone)
  try {
    const updates = {};
    if (typeof name === 'string') updates.name = name.trim();
    if (typeof phone === 'string') updates.phone = phone.trim();
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
    }
    await db.collection('users').doc(userId).update(updates);
    return res.status(200).json({ message: 'Profil mis à jour', updates });
  } catch (error) {
    console.error('Erreur update-user:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};