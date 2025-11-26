// script-register.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    const msg = document.getElementById('regMessage');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        msg.textContent = '';

        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim().toLowerCase();
        const phone = document.getElementById('regPhone').value.trim();
        const address = document.getElementById('regAddress').value.trim();

        if (!name || !email || !phone || !address) {
            msg.innerHTML = '<div class="alert alert-danger">Tous les champs sont requis.</div>';
            return;
        }

        try {
            const response = await fetch('/api/save-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, address })
            });

            const result = await response.json();
            if (response.ok) {
                const userId = result.userId;
                // Stocker l'utilisateur connecté
                localStorage.setItem('currentUser', JSON.stringify({
                    userId: userId,
                    name: name,
                    email: email,
                    phone: phone,
                    address: address
                }));
                msg.innerHTML = '<div class="alert alert-success">Compte créé ! Redirection…</div>';
                setTimeout(() => { window.location.href = 'index.html'; }, 900);
            } else {
                msg.innerHTML = '<div class="alert alert-danger">Erreur: ' + (result.message || 'Erreur inconnue') + '</div>';
            }

        } catch (err) {
            console.error('Erreur enregistrement:', err);
            msg.innerHTML = '<div class="alert alert-danger">Erreur réseau. Réessayez.</div>';
        }
    });
});
