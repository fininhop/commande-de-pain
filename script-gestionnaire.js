// =======================================================
// FICHIER : script-gestionnaire.js (CODE CLIENT)
// Gère l'affichage, le tri, la pagination et les options des commandes
// Adapté pour mobile : affiche des cartes sur petits écrans
// =======================================================

const ITEMS_PER_PAGE = 15;
let allOrders = [];
let currentPage = 1;
let currentSortField = 'createdAt';
let currentSortDirection = 'desc';

// Fetch orders from serverless API
window.fetchOrders = async function() {
    const ordersTableBody = document.getElementById('ordersTableBody');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');

    if (!loadingMessage || !errorMessage) {
        console.error('Erreur: Les éléments DOM ne sont pas chargés');
        return;
    }

    loadingMessage.textContent = 'Chargement des commandes...';
    if (ordersTableBody) ordersTableBody.innerHTML = '';
    errorMessage.textContent = '';
    errorMessage.classList.add('d-none');

    try {
        const response = await fetch('/api/get-orders');
        if (!response.ok) {
            let errorResult = { message: `Erreur HTTP ${response.status}` };
            try { errorResult = await response.json(); } catch (e) {}
            throw new Error(errorResult.message || `Erreur HTTP ${response.status}`);
        }
        const result = await response.json();
        allOrders = result.orders || [];
        loadingMessage.textContent = '';

        if (!allOrders || allOrders.length === 0) {
            if (ordersTableBody) ordersTableBody.innerHTML = '<tr><td colspan="8">Aucune commande trouvée.</td></tr>';
            const pc = document.getElementById('paginationContainer'); if (pc) pc.innerHTML = '';
            return;
        }

        // Trier par date décroissante par défaut
        currentPage = 1;
        sortOrders(currentSortField, currentSortDirection);
        renderPage();

    } catch (error) {
        console.error('Erreur de connexion à l\'API:', error);
        loadingMessage.textContent = '';
        errorMessage.textContent = `Échec de la récupération : ${error.message}. Vérifiez les variables Vercel/Firebase Admin.`;
        errorMessage.classList.remove('d-none');
    }
}

// Simple escape to avoid injecting raw HTML in modal titles
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Fonction pour le formatage de la date/heure
function formatDateTime(isoString) {
    try {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleDateString('fr-FR', options);
    } catch (e) {
        return isoString;
    }
}

// Phone validation helper — simple but practical
function isValidPhoneNumber(phone) {
    if (!phone) return false;
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length < 6) return false;
    const normalized = phone.trim();
    return /^\+?[0-9 ()\-]+$/.test(normalized);
}

// Fonction de tri
function sortOrders(field, direction = 'asc') {
    currentSortField = field;
    currentSortDirection = direction;
    currentPage = 1; // Réinitialiser à la première page

    allOrders.sort((a, b) => {
        let aVal = a[field];
        let bVal = b[field];

        // Traitement spécial pour les dates
        if (field === 'createdAt') {
            aVal = new Date(aVal) || new Date(0);
            bVal = new Date(bVal) || new Date(0);
        }

        // Traitement pour les chaînes
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    renderPage();
}

// Render page (table on desktop, cards on mobile)
function renderPage() {
    const ordersTableBody = document.getElementById('ordersTableBody');
    const ordersCardsContainer = document.getElementById('ordersCardsContainer');

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageOrders = allOrders.slice(startIndex, endIndex);

    const isMobile = window.innerWidth < 768;

    if (ordersTableBody) ordersTableBody.innerHTML = '';
    if (ordersCardsContainer) ordersCardsContainer.innerHTML = '';

    if (isMobile && ordersCardsContainer) {
        // Mobile: render cards
        pageOrders.forEach(order => {
            const itemsList = `<ul class="items-list mb-2">${(order.items || []).map(item => 
                `<li><strong>${item.quantity}</strong> x ${escapeHtml(item.name)}</li>`
            ).join('')}</ul>`;

            const card = document.createElement('div');
            card.className = 'card mb-3';
            card.innerHTML = `
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="fw-bold">${escapeHtml(order.name)} <small class="text-muted">${formatDateTime(order.createdAt)}</small></div>
                            <div class="text-sm">${escapeHtml(order.email || '')} ${order.phone ? ('• ' + escapeHtml(order.phone)) : ''}</div>
                        </div>
                        <div class="text-end">
                            <input type="checkbox" class="order-checkbox form-check-input mb-2" data-order-id="${order.id}">
                            <div><button type="button" class="btn btn-sm btn-outline-secondary options-btn">⋮ Options</button></div>
                        </div>
                    </div>
                    <div class="mt-2">${itemsList}</div>
                    <div class="mt-2 small">Retrait: ${escapeHtml(order.date || '')} • Renouveler: ${order.renouveler === 'oui' ? '✅ Oui' : '❌ Non'}</div>
                </div>
            `;
            ordersCardsContainer.appendChild(card);
        });

        // Attach listeners
        document.querySelectorAll('#ordersCardsContainer .order-checkbox').forEach(cb => cb.addEventListener('change', updateBulkActionsBar));
        document.querySelectorAll('#ordersCardsContainer .options-btn').forEach((btn, idx) => {
            const order = pageOrders[idx];
            btn.addEventListener('click', () => showOrderOptions(order.id, order.name, order.email, order.phone || ''));
        });

    } else if (ordersTableBody) {
        // Desktop: render table rows
        pageOrders.forEach(order => {
            const row = ordersTableBody.insertRow();
            // checkbox
            const checkboxCell = row.insertCell(0);
            checkboxCell.innerHTML = `<input type="checkbox" class="order-checkbox" data-order-id="${order.id}">`;

            const itemsList = `<ul class="items-list">${(order.items || []).map(item => 
                `<li><strong>${item.quantity}</strong> x ${escapeHtml(item.name)}</li>`
            ).join('')}</ul>`;

            row.insertCell(1).textContent = formatDateTime(order.createdAt);
            row.insertCell(2).textContent = order.name;
            row.insertCell(3).innerHTML = `Email: ${escapeHtml(order.email || '')}<br>Tél: ${escapeHtml(order.phone || 'N/A')}`;
            row.insertCell(4).textContent = order.date;
            row.insertCell(5).textContent = order.renouveler === 'oui' ? '✅ Oui' : '❌ Non';
            row.insertCell(6).innerHTML = itemsList;

            const actionsCell = row.insertCell(7);
            const optBtn = document.createElement('button');
            optBtn.type = 'button';
            optBtn.className = 'btn btn-sm btn-outline-secondary';
            optBtn.textContent = '⋮ Options';
            optBtn.addEventListener('click', () => showOrderOptions(order.id, order.name, order.email, order.phone || ''));
            actionsCell.appendChild(optBtn);
        });

        document.querySelectorAll('#ordersTableBody .order-checkbox').forEach(checkbox => checkbox.addEventListener('change', updateBulkActionsBar));
    }

    // Pagination
    createPagination();
}

// Fonction pour créer les boutons de pagination
function createPagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) return;
    paginationContainer.innerHTML = '';

    const totalPages = Math.ceil(allOrders.length / ITEMS_PER_PAGE);
    if (totalPages <= 1) return;

    // Bouton Précédent
    if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '← Précédent';
        prevBtn.className = 'pagination-btn btn btn-outline-primary me-1';
        prevBtn.onclick = () => {
            currentPage--;
            renderPage();
            window.scrollTo(0, 0);
        };
        paginationContainer.appendChild(prevBtn);
    }

    // Numéros de page
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'pagination-btn btn btn-primary pagination-active me-1' : 'pagination-btn btn btn-outline-primary me-1';
        pageBtn.onclick = () => {
            currentPage = i;
            renderPage();
            window.scrollTo(0, 0);
        };
        paginationContainer.appendChild(pageBtn);
    }

    // Bouton Suivant
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Suivant →';
        nextBtn.className = 'pagination-btn btn btn-outline-primary ms-1';
        nextBtn.onclick = () => {
            currentPage++;
            renderPage();
            window.scrollTo(0, 0);
        };
        paginationContainer.appendChild(nextBtn);
    }

    // Afficher le nombre de page actuelle
    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info ms-2';
    pageInfo.textContent = `Page ${currentPage} sur ${totalPages} (${allOrders.length} commandes)`;
    paginationContainer.appendChild(pageInfo);
}

// Bulk actions UI updater
function updateBulkActionsBar() {
    const checked = document.querySelectorAll('.order-checkbox:checked').length;
    const bar = document.getElementById('bulkActionsBar');
    const countEl = document.getElementById('bulkSelectedCount');
    // Debug log to help diagnose visibility issues
    console.debug('[bulk] checked=', checked, 'bar=', !!bar, 'countEl=', !!countEl);
    if (bar) {
        if (checked > 0) {
            bar.classList.remove('d-none');
            if (countEl) countEl.textContent = `${checked}`;
        } else {
            bar.classList.add('d-none');
            if (countEl) countEl.textContent = '0';
        }
    }
}

// Fonction pour afficher les options
window.showOrderOptions = function(orderId, orderName, orderEmail, orderPhone) {
    const modal = document.createElement('div');
    modal.className = 'modal-custom';
    modal.id = 'optionsModal';
    const sanitizedPhone = (orderPhone || '').trim();
    const hasPhone = isValidPhoneNumber(sanitizedPhone);
    const isAndroid = /android/.test(navigator.userAgent.toLowerCase());

    let buttonsHtml = '';
    buttonsHtml += `<button class="btn btn-outline-primary" onclick="openEmailClient('${orderEmail}', '${escapeHtml(orderName)}', '${sanitizedPhone.replace(/'/g, "\\'")}')">📧 Envoyer un Email</button>`;
    if (hasPhone && isAndroid) {
        buttonsHtml += `<button class="btn btn-success" onclick="window.location.href='tel:${sanitizedPhone.replace(/[^0-9+\- ]/g,'')}'; document.getElementById('optionsModal').remove();">📞 Appeler</button>`;
    }
    buttonsHtml += `<button class="btn btn-danger" onclick="deleteOrder('${orderId}', '${escapeHtml(orderName)}')">🗑️ Supprimer</button>`;
    buttonsHtml += `<button class="btn btn-light" onclick="document.getElementById('optionsModal').remove()">❌ Annuler</button>`;

    modal.innerHTML = `
        <div class="modal-content p-3 bg-white rounded shadow-sm">
            <button type="button" class="btn-close float-end" aria-label="Close" onclick="document.getElementById('optionsModal').remove()"></button>
            <h2 class="h5 text-center mt-2">Options pour ${escapeHtml(orderName)}</h2>
            <div class="d-grid gap-2 mt-3">${buttonsHtml}</div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Fonction pour ouvrir le client email
window.openEmailClient = function(email, orderName, phone) {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(userAgent);
    const isIOS = /iphone|ipad|ipod/.test(userAgent);

    const subject = encodeURIComponent(`Commande de Pain Bio - ${orderName}`);
    const body = encodeURIComponent(`Bonjour ${orderName},\n\nConcernant votre commande de pain bio...\n\nCordialement,\nÉquipe Pain Bio`);
    const gmailUrl = `https://mail.google.com/mail/u/0/?fs=1&to=${email}&su=${subject}&body=${body}`;
    const yahooUrl = `https://compose.mail.yahoo.com/?to=${email}&subject=${subject}&body=${body}`;

    if (isAndroid || isIOS) {
        const mobileModal = document.createElement('div');
        mobileModal.className = 'modal-custom';
        mobileModal.id = 'mobileActionsModal';
        mobileModal.innerHTML = `
            <div class="modal-content p-3 bg-white rounded shadow-sm">
                <button type="button" class="btn-close float-end" aria-label="Close" onclick="document.getElementById('mobileActionsModal').remove()"></button>
                <h2 class="h5 text-center mt-2">Choisir une action</h2>
                <div class="d-grid gap-2 mt-3">
                    <button class="btn btn-primary" onclick="window.location.href = 'mailto:${email}?subject=${subject}&body=${body}'; document.getElementById('mobileActionsModal').remove(); document.getElementById('optionsModal').remove();">📧 Envoyer un Email</button>
                    <button class="btn btn-success" onclick="window.location.href = 'tel:${(phone || '').replace(/[^0-9+\- ]/g, '')}'; document.getElementById('mobileActionsModal').remove(); document.getElementById('optionsModal').remove();">📞 Appeler</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('mobileActionsModal').remove()">❌ Annuler</button>
                </div>
            </div>
        `;
        document.body.appendChild(mobileModal);
    } else {
        const emailModal = document.createElement('div');
        emailModal.className = 'modal-custom';
        emailModal.id = 'emailModal';
        emailModal.innerHTML = `
            <div class="modal-content p-3 bg-white rounded shadow-sm">
                <button type="button" class="btn-close float-end" aria-label="Close" onclick="document.getElementById('emailModal').remove()"></button>
                <h2 class="h5 text-center mt-2">Choisir un client email</h2>
                <div class="d-grid gap-2 mt-3">
                    <button class="btn btn-outline-primary" onclick="window.open('${gmailUrl}', '_blank'); document.getElementById('emailModal').remove(); document.getElementById('optionsModal').remove();">Gmail</button>
                    <button class="btn btn-outline-primary" onclick="window.open('${yahooUrl}', '_blank'); document.getElementById('emailModal').remove(); document.getElementById('optionsModal').remove();">Yahoo</button>
                    <button class="btn btn-secondary" onclick="window.location.href = 'mailto:${email}?subject=${subject}&body=${body}'; document.getElementById('emailModal').remove(); document.getElementById('optionsModal').remove();">Client Email par Défaut</button>
                    <button class="btn btn-light" onclick="document.getElementById('emailModal').remove()">❌ Annuler</button>
                </div>
            </div>
        `;
        document.body.appendChild(emailModal);
    }
}

// Fonction pour supprimer une commande
window.deleteOrder = async function(orderId, orderName) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la commande de ${orderName} ?`)) return;

    try {
        const response = await fetch(`/api/delete-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
        });

        if (response.ok) {
            alert('Commande supprimée avec succès !');
            allOrders = allOrders.filter(order => order.id !== orderId);
            renderPage();
            const optionsModal = document.getElementById('optionsModal'); if (optionsModal) optionsModal.remove();
        } else {
            const error = await response.json();
            alert(`Erreur: ${error.message}`);
        }
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur réseau lors de la suppression');
    }
}

// Fonction pour supprimer plusieurs commandes
window.deleteSelectedOrders = async function() {
    const checkboxes = document.querySelectorAll('.order-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('Veuillez sélectionner au moins une commande à supprimer.');
        return;
    }
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${checkboxes.length} commande(s) ?`)) return;

    const orderIds = Array.from(checkboxes).map(cb => cb.dataset.orderId);
    try {
        const response = await fetch(`/api/delete-orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderIds })
        });

        if (response.ok) {
            alert(`${checkboxes.length} commande(s) supprimée(s) avec succès !`);
            allOrders = allOrders.filter(order => !orderIds.includes(order.id));
            renderPage();
            const selectAll = document.getElementById('selectAllCheckbox'); if (selectAll) selectAll.checked = false;
        } else {
            const error = await response.json();
            alert(`Erreur: ${error.message}`);
        }
    } catch (error) {
        console.error('Erreur lors de la suppression en masse:', error);
        alert('Erreur réseau lors de la suppression en masse');
    }
}

// Fonction pour supprimer toutes les commandes (utilitaire admin)
window.deleteAllOrders = async function() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer TOUTES les commandes ? Cette action est irréversible.')) return;
    try {
        const orderIds = allOrders.map(o => o.id);
        if (orderIds.length === 0) {
            alert('Aucune commande à supprimer.');
            return;
        }
        const response = await fetch(`/api/delete-orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderIds })
        });

        if (response.ok) {
            alert(`${orderIds.length} commande(s) supprimée(s) avec succès !`);
            allOrders = [];
            renderPage();
            const selectAll = document.getElementById('selectAllCheckbox'); if (selectAll) selectAll.checked = false;
        } else {
            const error = await response.json();
            alert(`Erreur: ${error.message}`);
        }
    } catch (error) {
        console.error('Erreur lors de la suppression de toutes les commandes:', error);
        alert('Erreur réseau lors de la suppression de toutes les commandes');
    }
}

// Select all toggle
window.toggleSelectAll = function(checked) {
    document.querySelectorAll('.order-checkbox').forEach(cb => { cb.checked = checked; });
    updateBulkActionsBar();
}

// Init: fetch orders and wire up resize debounce and selectAll
document.addEventListener('DOMContentLoaded', () => {
    const selectAll = document.getElementById('selectAllCheckbox');
    if (selectAll) selectAll.addEventListener('change', (e) => toggleSelectAll(e.target.checked));

    // Debounced resize to re-render for mobile/table switch
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            renderPage();
        }, 200);
    });

    // Bulk actions bar delete button
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (bulkDeleteBtn) bulkDeleteBtn.addEventListener('click', deleteSelectedOrders);

    fetchOrders();
});
