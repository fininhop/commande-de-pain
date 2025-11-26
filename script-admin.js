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
    const sortSelect = document.getElementById('sortSelect');
    const ordersContainer = document.getElementById('ordersContainer');

    // Gestionnaire de tri
    sortSelect.addEventListener('change', () => {
        currentSortBy = sortSelect.value;
        if (currentOrders.length > 0) {
            renderOrders(currentOrders, currentSortBy);
        }
    });

    function renderOrders(orders, sortBy = 'createdAt') {
        if (!orders || !orders.length) {
            ordersContainer.innerHTML = '<div class="alert alert-info text-center py-5"><h5>📭 Aucune commande trouvée</h5><p class="mb-0">Il n\'y a pas encore de commandes à afficher.</p></div>';
            return;
        }

        // Trier les commandes
        const sortedOrders = [...orders].sort((a, b) => {
            let aVal, bVal;
            switch (sortBy) {
                case 'createdAt':
                    aVal = new Date(a.createdAt || 0);
                    bVal = new Date(b.createdAt || 0);
                    return bVal - aVal; // Plus récent en premier
                case 'date':
                    aVal = a.date || '';
                    bVal = b.date || '';
                    return aVal.localeCompare(bVal);
                case 'name':
                    aVal = (a.name || '').toLowerCase();
                    bVal = (b.name || '').toLowerCase();
                    return aVal.localeCompare(bVal);
                case 'renouveler':
                    aVal = (a.renouveler || '').toLowerCase();
                    bVal = (b.renouveler || '').toLowerCase();
                    return aVal.localeCompare(bVal);
                default:
                    return 0;
            }
        });

        // Générer les cartes
        let html = '';
        sortedOrders.forEach(o => {
            const items = (o.items || []).map(it => 
                `<div class="item-row"><span>${it.quantity} × ${it.name}</span><span class="text-muted">${it.price ? '€' + (it.price * it.quantity).toFixed(2) : ''}</span></div>`
            ).join('');
            
            const rn = (o.renouveler || '').toString().trim().toLowerCase();
            const rnBadge = rn === 'oui' 
                ? '<span class="badge bg-success">🔄 Oui</span>' 
                : rn === 'non' 
                    ? '<span class="badge bg-secondary">❌ Non</span>' 
                    : '<span class="badge bg-light text-muted">—</span>';
            
            const dateCmd = o.createdAt ? new Date(o.createdAt).toLocaleDateString('fr-FR', { 
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            }) : '—';
            
            const dateRetrait = o.date ? new Date(o.date).toLocaleDateString('fr-FR', { 
                weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' 
            }) : '—';

            html += `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="order-card" data-order-id="${o.id}" data-order-date="${o.date || ''}" data-order-ren="${rn}">
                        <div class="order-header">
                            <h6 class="order-title">👤 ${o.name}</h6>
                            <p class="order-date">📅 ${dateCmd}</p>
                        </div>
                        <div class="order-body">
                            <div class="order-info">
                                <div class="info-item">
                                    <span class="info-label">📧 Contact</span>
                                    <span class="info-value">${o.email}<br><small class="text-muted">${o.phone}</small></span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">📍 Retrait</span>
                                    <span class="info-value">${dateRetrait}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">🔄 Renouveler</span>
                                    <span class="info-value">${rnBadge}</span>
                                </div>
                            </div>
                            
                            <div class="items-section">
                                <div class="items-title">🛒 Articles commandés</div>
                                ${items}
                            </div>
                            
                            <div class="order-actions">
                                <button class="btn btn-sm btn-outline-secondary btn-edit">✏️ Éditer</button>
                                <button class="btn btn-sm btn-outline-danger btn-delete">🗑️ Supprimer</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        ordersContainer.innerHTML = `<div class="row g-3">${html}</div>`;

        // Attacher écouteurs aux boutons
        ordersContainer.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const card = e.target.closest('.order-card');
                const orderId = card && card.getAttribute('data-order-id');
                const clientName = card && card.querySelector('.order-title').textContent;
                if (!orderId) return;
                if (!confirm(`Confirmer la suppression de la commande de ${clientName} ?`)) return;
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
                        card.remove();
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

        ordersContainer.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.order-card');
                const orderId = card && card.getAttribute('data-order-id');
                const date = card && card.getAttribute('data-order-date');
                const rn = card && card.getAttribute('data-order-ren');
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

    let currentOrders = [];
    let currentSortBy = 'createdAt';

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

            currentOrders = result.orders || [];
            renderOrders(currentOrders, currentSortBy);
            showMessage('Chargé: ' + currentOrders.length + ' commandes', 'success');
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
        ordersContainer.innerHTML = '';
        showMessage('Déconnecté');
    });
});
