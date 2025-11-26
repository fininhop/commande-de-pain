// middleware/admin-only.js - Vérification du token administrateur

module.exports = function(req, res) {
    const token = req.headers['x-admin-token'];

    if (!token) {
        res.status(401).json({ message: 'Token administrateur requis' });
        return false;
    }

    // Vérifier le token (à adapter selon votre système de tokens)
    const expectedToken = process.env.ADMIN_TOKEN;

    if (token !== expectedToken) {
        res.status(403).json({ message: 'Token administrateur invalide' });
        return false;
    }

    return true;
};