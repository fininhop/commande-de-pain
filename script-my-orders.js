// script-my-orders.js - Affiche les commandes du user connecté (lecture seule)
document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('ordersList');
    const logout = document.getElementById('logoutLink');

    const stored = localStorage.getItem('currentUser');
    let currentUser = null;
    try { currentUser = stored ? JSON.parse(stored) : null; } catch(e) { currentUser = null; }

    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    if (logout) {
        logout.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem('currentUser'); window.location.href = 'login.html'; });
    }

    container.textContent = 'Chargement de vos commandes...';

    try {
        const response = await fetch('/api/get-orders-by-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.userId, email: currentUser.email })
        });

        let result = null;
        try { result = await response.json(); } catch (e) { result = null; }

        if (!response.ok) {
            container.innerHTML = '<div class="alert alert-danger">Erreur lors de la récupération des commandes: ' + (result && result.message ? result.message : response.statusText) + '</div>';
            return;
        }

        const orders = (result && result.orders) ? result.orders : [];
        if (!orders.length) {
            container.innerHTML = '<div class="alert alert-info">Aucune commande trouvée.</div>';
            return;
        }

        container.innerHTML = '';
        orders.forEach(o => {
            const card = document.createElement('div');
            card.className = 'card order-card';
            const itemsHtml = (o.items || []).map(it => `<div>${it.quantity} × ${it.name} <span class="small-muted">(${it.price ? '€ '+it.price : ''})</span></div>`).join('');
            card.innerHTML = `
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <div>
                            <strong>${o.name}</strong> — <span class="small-muted">${o.email} · ${o.phone}</span>
                            <div class="small-muted">Commande: ${o.createdAt || '—'}</div>
                        </div>
                        <div class="text-end">
                            <div class="small-muted">Retrait: ${o.date || '—'}</div>
                            <div class="small-muted">Renouveler: ${o.renouveler || '—'}</div>
                        </div>
                    </div>
                    <div class="mt-2">${itemsHtml}</div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (err) {
        console.error('Erreur récupération commandes:', err);
        container.innerHTML = '<div class="alert alert-danger">Erreur réseau. Réessayez plus tard.</div>';
    }
});
