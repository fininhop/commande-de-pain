// /api/change-password.js
// Permet à un utilisateur connecté de changer son mot de passe en fournissant l'ancien et le nouveau.

const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch (e) {
    console.error('Erreur initialisation Admin SDK (change-password):', e.message);
  }
}
const db = admin.firestore();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée' });
  const { userId, currentPassword, newPassword } = req.body || {};
  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ message: 'userId, mot de passe actuel et nouveau mot de passe requis' });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' });
  }
  try {
    const userRef = db.collection('users').doc(userId);
    const snap = await userRef.get();
    if (!snap.exists) return res.status(404).json({ message: 'Utilisateur introuvable' });
    const data = snap.data();
    const matches = await bcrypt.compare(currentPassword, data.passwordHash);
    if (!matches) return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    const newHash = await bcrypt.hash(newPassword, 10);
    await userRef.update({ passwordHash: newHash, passwordChangedAt: admin.firestore.FieldValue.serverTimestamp() });
    return res.status(200).json({ message: 'Mot de passe mis à jour' });
  } catch (error) {
    console.error('Erreur change-password:', error);
    return res.status(500).json({ message: 'Erreur serveur lors du changement de mot de passe', error: error.message });
  }
};
