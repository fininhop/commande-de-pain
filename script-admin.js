// script-admin.js - Interface d'administration simple (token-based)
document.addEventListener('DOMContentLoaded', () => {
    const adminLogin = document.getElementById('adminLogin');
    const adminArea = document.getElementById('adminArea');
    const adminForm = document.getElementById('adminLoginForm');
    const tokenInput = document.getElementById('adminTokenInput');
    const refreshBtn = document.getElementById('refreshBtn');
    const ordersTableContainer = document.getElementById('ordersTableContainer');
    const adminMessage = document.getElementById('adminMessage');
    const logoutAdmin = document.getElementById('logoutAdmin');

    function showMessage(text, type='') {
        adminMessage.innerHTML = text ? `<div class="text-${type}">${text}</div>` : '';
    }

    function renderOrders(orders) {
        if (!orders || !orders.length) {
            ordersTableContainer.innerHTML = '<div class="alert alert-info">Aucune commande trouvée.</div>';
            return;
        }

        let html = '<table class="table table-sm table-striped">';
        html += '<thead><tr><th>Id</th><th>Date Cmd</th><th>Nom</th><th>Contact</th><th>Retrait</th><th>Articles</th></tr></thead><tbody>';
        orders.forEach(o => {
            const items = (o.items || []).map(it => `${it.quantity}× ${it.name}`).join('<br>');
            html += `<tr class="order-row"><td>${o.id}</td><td>${o.createdAt || '—'}</td><td>${o.name}</td><td>${o.email}<br>${o.phone}</td><td>${o.date || '—'}</td><td>${items}</td></tr>`;
        });
        html += '</tbody></table>';
        ordersTableContainer.innerHTML = html;
    }

    async function fetchAdminOrders(token) {
        showMessage('Chargement...', 'muted');
        try {
            const response = await fetch('/api/get-orders-admin', { headers: { 'x-admin-token': token } });
            let result = null;
            try { result = await response.json(); } catch(e) { result = null; }

            if (!response.ok) {
                showMessage('Erreur: ' + (result && result.message ? result.message : response.statusText), 'danger');
                return;
            }

            renderOrders(result.orders || []);
            showMessage('Chargé: ' + (result.orders ? result.orders.length : 0) + ' commandes', 'success');
        } catch (err) {
            console.error('Erreur admin fetch:', err);
            showMessage('Erreur réseau. Réessayez.', 'danger');
        }
    }

    // Si token existant en localStorage, tenter login automatique
    const storedToken = localStorage.getItem('adminToken');
    if (storedToken) {
        adminLogin.classList.add('d-none');
        adminArea.classList.remove('d-none');
        fetchAdminOrders(storedToken);
    }

    adminForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const token = tokenInput.value.trim();
        if (!token) return;
        localStorage.setItem('adminToken', token);
        adminLogin.classList.add('d-none');
        adminArea.classList.remove('d-none');
        fetchAdminOrders(token);
    });

    refreshBtn.addEventListener('click', () => {
        const t = localStorage.getItem('adminToken');
        if (!t) { showMessage('Token manquant', 'danger'); return; }
        fetchAdminOrders(t);
    });

    logoutAdmin.addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        adminArea.classList.add('d-none');
        adminLogin.classList.remove('d-none');
        ordersTableContainer.innerHTML = '';
        showMessage('Déconnecté');
    });
});
