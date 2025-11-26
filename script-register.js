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

        if (!name || !email) {
            msg.innerHTML = '<div class="alert alert-danger">Nom et email requis.</div>';
            return;
        }

        try {
            const response = await fetch('/api/save-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone })
            });

            const result = await response.json();
            if (response.ok) {
                const userId = result.userId || (result.user && result.user.id) || null;
                const user = { userId: userId, name: name, email: email, phone: phone };
                localStorage.setItem('currentUser', JSON.stringify(user));
                msg.innerHTML = '<div class="alert alert-success">Connecté en tant que ' + name + '. Redirection…</div>';
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
