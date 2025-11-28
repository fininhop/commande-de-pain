// script-my-orders.js - Mes commandes avec annulation sous conditions

function showToast(title, message, type = 'info') {
    const toastEl = document.getElementById('liveToast');
    if (!toastEl) return;
    const toastTitle = document.getElementById('toastTitle');
    const toastBody = document.getElementById('toastBody');
    const toastHeader = toastEl.querySelector('.toast-header');
    toastTitle.textContent = title;
    toastBody.textContent = message;
    toastHeader.classList.remove('bg-success','bg-danger','bg-warning','bg-info','text-white');
    if (type === 'success') toastHeader.classList.add('bg-success','text-white');
    else if (type === 'error' || type === 'danger') toastHeader.classList.add('bg-danger','text-white');
    else if (type === 'warning') toastHeader.classList.add('bg-warning');
    else toastHeader.classList.add('bg-info','text-white');
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
}

let CURRENT_MY_ORDERS = [];
let MY_ORDERS_FP = '';
let AUTO_REFRESH_HANDLE = null;

function fingerprintOrders(list){
    try { return JSON.stringify((list||[]).map(o=>({id:String(o.id||''),d:String(o.date||''),len:(o.items||[]).length})).sort((a,b)=>a.id.localeCompare(b.id))); } catch(e){ return ''; }
}

function canCancelOrder(order){
    const endDateStr = order && (order.date || order.seasonEndDate);
    if (!endDateStr) return { ok:false, info:'Date de fin de saison inconnue.' };
    const now = new Date();
    const end = new Date(endDateStr);
    const diffHours = (end.getTime() - now.getTime()) / (1000*60*60);
    if (diffHours >= 48) return { ok:true, info:'' };
    if (diffHours > 0) return { ok:false, info:`Annulation impossible: moins de 48h avant la fin de la saison (${Math.floor(diffHours)}h restantes).` };
    return { ok:false, info:'Annulation impossible: la saison est terminée.' };
}

async function fetchMyOrders(){
    const stored = localStorage.getItem('currentUser');
    let currentUser = null;
    try { currentUser = stored ? JSON.parse(stored) : null; } catch(e) { currentUser = null; }
    if (!currentUser) { window.location.href = 'index.html'; return; }
    const r = await fetch('/api/get-orders-by-user', {
        method:'POST', headers:{ 'Content-Type':'application/json' }, cache:'no-cache',
        body: JSON.stringify({ userId: currentUser.userId || currentUser.id, email: currentUser.email })
    });
    const j = await r.json().catch(()=>({}));
    if (!r.ok || !j || !j.orders) {
        showToast('❌ Erreur', (j && j.message) ? j.message : 'Chargement des commandes impossible', 'error');
        renderMyOrders([]); return;
    }
    CURRENT_MY_ORDERS = j.orders || [];
    MY_ORDERS_FP = fingerprintOrders(CURRENT_MY_ORDERS);
    renderMyOrders(CURRENT_MY_ORDERS);
}

function renderMyOrders(list){
    const container = document.getElementById('myOrdersContainer');
    if (!container) return;
    if (!list || list.length === 0) { container.innerHTML = '<div class="alert alert-info">Vous n\'avez pas encore de commandes.</div>'; return; }
    const html = list.map(o => {
        const total = (o.items||[]).reduce((s,it)=> s + (Number(it.price||0) * Number(it.quantity||0)), 0);
        const lines = (o.items||[]).map(it => `${it.quantity} × ${it.name} (€${Number(it.price||0).toFixed(2)})`).join('<br>');
        const { ok, info } = canCancelOrder(o);
        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="fw-bold">${o.seasonName || o.seasonId || ''}</div>
                            <div class="text-muted small">Livraison: ${new Date(o.date||'').toLocaleDateString('fr-FR')}</div>
                        </div>
                        <div class="text-end">
                            <div class="fw-bold">Total: €${total.toFixed(2)}</div>
                            ${ok ? `<button class="btn btn-sm btn-outline-danger" data-action="cancel" data-id="${o.id}">Annuler</button>` : `<span class="badge bg-secondary">Non annulable</span>`}
                        </div>
                    </div>
                    <hr>
                    <div class="small">${lines}</div>
                    ${(!ok && info) ? `<div class="mt-2 alert alert-warning py-2 mb-0">${info}</div>` : ''}
                </div>
            </div>`;
    }).join('');
    container.innerHTML = html;
    container.querySelectorAll('button[data-action="cancel"]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const order = (CURRENT_MY_ORDERS||[]).find(x => String(x.id||'') === String(id));
            const check = canCancelOrder(order);
            if (!check.ok) { showToast('⏳ Trop tard', check.info || 'Annulation impossible', 'warning'); return; }
            if (!confirm('Confirmer l\'annulation de cette commande ?')) return;
            try {
                const r = await fetch(`/api/delete-order?id=${encodeURIComponent(id)}`, { method:'DELETE' });
                const j = await r.json().catch(()=>({}));
                if (r.ok && j && j.ok) { showToast('✅ Annulée', 'Votre commande a été annulée.', 'success'); await fetchMyOrders(); }
                else { showToast('❌ Erreur', (j && j.message) ? j.message : 'Annulation impossible', 'error'); }
            } catch(err) { console.error(err); showToast('❌ Erreur réseau', 'Réessayez plus tard.', 'error'); }
        });
    });
}

async function pollMyOrdersIfChanged(){
    const stored = localStorage.getItem('currentUser');
    let currentUser = null;
    try { currentUser = stored ? JSON.parse(stored) : null; } catch(e) { currentUser = null; }
    if (!currentUser) return;
    const r = await fetch('/api/get-orders-by-user', {
        method:'POST', headers:{ 'Content-Type':'application/json' }, cache:'no-cache',
        body: JSON.stringify({ userId: currentUser.userId || currentUser.id, email: currentUser.email })
    });
    const j = await r.json().catch(()=>({}));
    if (!r.ok || !j || !j.orders) return;
    const fp = fingerprintOrders(j.orders||[]);
    if (fp !== MY_ORDERS_FP) { CURRENT_MY_ORDERS = j.orders||[]; MY_ORDERS_FP = fp; renderMyOrders(CURRENT_MY_ORDERS); }
}

document.addEventListener('DOMContentLoaded', async () => {
    const logout = document.getElementById('logoutLink');
    if (logout) { logout.addEventListener('click', (e)=>{ e.preventDefault(); localStorage.removeItem('currentUser'); window.location.href = 'index.html'; }); }
    showPageLoader('Chargement des commandes…');
    try { await fetchMyOrders(); } finally { hidePageLoader(); }
    if (!AUTO_REFRESH_HANDLE) { AUTO_REFRESH_HANDLE = setInterval(pollMyOrdersIfChanged, 10000); }
});
            card.innerHTML = `
                <div class="order-header">
                    <div class="order-date">📅 ${dateCmd}</div>
                    <div class="order-id">ID: ${o.id}</div>
                </div>
                <div class="order-info">
                    <div class="info-item">
                        <span class="info-label">📍 Retrait:</span>
                        <span class="info-value">${o.date || '—'}</span>
                    </div>
                </div>
                <div class="items-section">
                    <div class="items-title">🛍️ Articles commandés</div>
                    ${itemsHtml}
                    <div class="text-end"><strong>Total:</strong> €${total.toFixed(2)}</div>
                </div>
            `;
            container.appendChild(card);
        });

    }

    try {
        await fetchAndRender();
        if (!AUTO_REFRESH_HANDLE) {
            AUTO_REFRESH_HANDLE = setInterval(async ()=>{
                try {
                    const response = await fetch('/api/get-orders-by-user', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: currentUser.userId, email: currentUser.email }), cache: 'no-cache'
                    });
                    const result = await response.json().catch(()=>null);
                    if (!response.ok || !result) return;
                    const orders = result.orders || [];
                    const fp = computeFingerprint(orders);
                    if (fp !== ORDERS_FP) {
                        await fetchAndRender();
                    }
                } catch(e){ /* noop */ }
            }, 10000);
        }
    } catch (err) {
        console.error('Erreur récupération commandes:', err);
        showToast('❌ Erreur réseau', 'Impossible de charger les commandes.', 'error');
        container.innerHTML = '<div class="alert alert-warning">Erreur réseau. Réessayez plus tard.</div>';
    } finally {
        hidePageLoader();
    }
});
