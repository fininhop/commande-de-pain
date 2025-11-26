// script-login.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const msg = document.getElementById('loginMessage');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        msg.textContent = '';

        const email = document.getElementById('loginEmail').value.trim().toLowerCase();

        if (!email) {
            msg.innerHTML = '<div class="alert alert-danger">Email requis.</div>';
            return;
        }

        try {
            const response = await fetch(`/api/find-user?email=${encodeURIComponent(email)}`);

            if (response.ok) {
                const result = await response.json();
                const userId = result.userId;
                const userData = result.user;

                // Stocker l'utilisateur connecté
                localStorage.setItem('currentUser', JSON.stringify({
                    userId: userId,
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone || '',
                    address: userData.address || ''
                }));

                msg.innerHTML = '<div class="alert alert-success">Connecté en tant que ' + userData.name + '. Redirection…</div>';
                setTimeout(() => { window.location.href = 'index.html'; }, 900);
            } else {
                msg.innerHTML = '<div class="alert alert-warning">Email non trouvé. <a href="register.html">S\'enregistrer</a></div>';
            }

        } catch (err) {
            console.error('Erreur login:', err);
            msg.innerHTML = '<div class="alert alert-danger">Erreur réseau. Réessayez.</div>';
        }
    });
});
