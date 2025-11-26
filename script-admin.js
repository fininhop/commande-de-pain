// script-admin.js - Interface d'administration simple (token-based)

// Toast notification function
function showToast(title, message, type = 'info') {
    const toastEl = document.getElementById('liveToast');
    if (!toastEl) return;
    
    const toastTitle = document.getElementById('toastTitle');
    const toastBody = document.getElementById('toastBody');
    const toastHeader = toastEl.querySelector('.toast-header');
    
    toastTitle.textContent = title;
    toastBody.textContent = message;
    
    toastHeader.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info', 'text-white');
    
    if (type === 'success') {
        toastHeader.classList.add('bg-success', 'text-white');
    } else if (type === 'error' || type === 'danger') {
        toastHeader.classList.add('bg-danger', 'text-white');
    } else if (type === 'warning') {
        toastHeader.classList.add('bg-warning');
    } else {
        toastHeader.classList.add('bg-info', 'text-white');
    }
    
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
}

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
        html += '<thead><tr><th>Id</th><th>Date Cmd</th><th>Nom</th><th>Contact</th><th>Retrait</th><th>Renouveler</th><th>Articles</th><th>Actions</th></tr></thead><tbody>';
        orders.forEach(o => {
            const items = (o.items || []).map(it => `${it.quantity}× ${it.name}`).join('<br>');
            const rn = (o.renouveler || '').toString().trim().toLowerCase();
            const rnBadge = rn === 'oui' 
                ? '<span class="badge bg-success">Oui</span>' 
                : rn === 'non' 
                    ? '<span class="badge bg-secondary">Non</span>' 
                    : '<span class="text-muted">—</span>';
            
            html += `<tr class="order-row" data-order-id="${o.id}" data-order-date="${o.date || ''}" data-order-ren="${rn}">` +
                `<td>${o.id}</td><td>${o.createdAt || '—'}</td><td>${o.name}</td>` +
                `<td>${o.email}<br>${o.phone}</td><td>${o.date || '—'}</td><td>${rnBadge}</td><td>${items}</td>` +
                `<td>` +
                    `<button class="btn btn-sm btn-outline-danger btn-delete">Supprimer</button> ` +
                    `<button class="btn btn-sm btn-outline-secondary btn-edit">Éditer</button>` +
                `</td>` +
            `</tr>`;
        });
        html += '</tbody></table>';
        ordersTableContainer.innerHTML = html;

        // Attacher écouteurs aux boutons
        ordersTableContainer.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tr = e.target.closest('tr');
                const orderId = tr && tr.getAttribute('data-order-id');
                if (!orderId) return;
                if (!confirm('Confirmer la suppression de la commande ' + orderId + ' ?')) return;
                const token = localStorage.getItem('adminToken');
                try {
                    const resp = await fetch('/api/delete-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
                        body: JSON.stringify({ orderId })
                    });
                    const jr = await resp.json().catch(() => null);
                    if (resp.ok) {
                        showToast('✅ Succès', 'Commande supprimée', 'success');
                        tr.remove();
                    } else {
                        showToast('❌ Erreur', 'Suppression échouée: ' + (jr && jr.message ? jr.message : resp.statusText), 'error');
                    }
                } catch (err) {
                    console.error('Erreur delete:', err);
                    showToast('❌ Erreur réseau', 'Impossible de supprimer la commande', 'error');
                }
            });
        });

        // Modal-based edit
        const modalEl = document.getElementById('editModal');
        const modal = modalEl ? new bootstrap.Modal(modalEl) : null;
        const editOrderId = document.getElementById('editOrderId');
        const editDate = document.getElementById('editDate');
        const editRen = document.getElementById('editRenouveler');
        const saveEditBtn = document.getElementById('saveEditBtn');

        ordersTableContainer.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tr = e.target.closest('tr');
                const orderId = tr && tr.getAttribute('data-order-id');
                const date = tr && tr.getAttribute('data-order-date');
                const rn = tr && tr.getAttribute('data-order-ren');
                if (!orderId || !modal) return;
                editOrderId.value = orderId;
                editDate.value = (date || '');
                editRen.value = (rn === 'oui' || rn === 'non') ? rn : '';
                modal.show();
            });
        });

        if (saveEditBtn && modal) {
            saveEditBtn.onclick = async () => {
                const orderId = editOrderId.value;
                const updates = {};
                if (editDate.value) updates.date = editDate.value;
                if (editRen.value) updates.renouveler = editRen.value;
                if (!orderId || Object.keys(updates).length === 0) { modal.hide(); return; }
                const token = localStorage.getItem('adminToken');
                try {
                    const resp = await fetch('/api/update-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
                        body: JSON.stringify({ orderId, updates })
                    });
                    const jr = await resp.json().catch(() => null);
                    if (resp.ok) {
                        showToast('✅ Succès', 'Commande mise à jour', 'success');
                        modal.hide();
                        fetchAdminOrders(token);
                    } else {
                        showToast('❌ Erreur', 'Mise à jour échouée: ' + (jr && jr.message ? jr.message : resp.statusText), 'error');
                    }
                } catch (err) {
                    console.error('Erreur update:', err);
                    showToast('❌ Erreur réseau', 'Impossible de mettre à jour', 'error');
                }
            };
        }
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
