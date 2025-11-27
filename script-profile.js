document.addEventListener('DOMContentLoaded', () => {
  const profileForm = document.getElementById('profileForm');
  const nameInput = document.getElementById('profileName');
  const phoneInput = document.getElementById('profilePhone');
  const emailInput = document.getElementById('profileEmail');
  const deleteBtn = document.getElementById('deleteAccountBtn');
  const passwordForm = document.getElementById('passwordForm');
  const currentPwdInput = document.getElementById('currentPassword');
  const newPwdInput = document.getElementById('newPassword');
  const confirmPwdInput = document.getElementById('confirmNewPassword');
  const pwdStrengthText = document.getElementById('pwdStrengthText');
  const passwordFeedback = document.getElementById('passwordFeedback');

  // Récupération utilisateur (clé standardisée: currentUser)
  let user = null;
  try { user = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch (e) { user = null; }
  if (!user) {
    // fallback ancienne clé 'user'
    try { user = JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) { user = null; }
  }
  if (!user) {
    alert('Utilisateur non connecté.');
    window.location.href = 'index.html';
    return;
  }

  nameInput.value = user.name || '';
  phoneInput.value = user.phone || '';
  emailInput.value = user.email || '';

  function updateStoredUser(patch) {
    user = { ...user, ...patch };
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user)); // compat rétro
  }

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      userId: user.userId || user.id,
      name: nameInput.value.trim(),
      phone: phoneInput.value.trim()
    };
    if (!payload.userId) { alert('Identifiant utilisateur manquant'); return; }
    try {
      const resp = await fetch('/api/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const jr = await resp.json().catch(() => null);
      if (resp.ok) {
        updateStoredUser({ name: payload.name, phone: payload.phone });
        alert('Profil mis à jour');
      } else {
        alert(jr && jr.message ? jr.message : 'Erreur mise à jour du profil');
      }
    } catch (err) {
      alert('Erreur réseau');
    }
  });

  deleteBtn.addEventListener('click', async () => {
    if (!confirm('Confirmez la suppression de votre compte ?')) return;
    const userId = user.userId || user.id;
    if (!userId) { alert('Identifiant utilisateur manquant'); return; }
    try {
      const resp = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const jr = await resp.json().catch(() => null);
      if (resp.ok) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('user');
        alert('Compte supprimé');
        window.location.href = 'index.html';
      } else {
        alert(jr && jr.message ? jr.message : 'Erreur suppression du compte');
      }
    } catch (err) {
      alert('Erreur réseau');
    }
  });

  // ---------------- Changement de mot de passe ----------------
  function evalStrength(pwd) {
    if (!pwd) return '';
    const cond = [/[A-Z]/, /[a-z]/, /[0-9]/, /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/];
    const met = cond.filter(r=> r.test(pwd)).length;
    if (pwd.length < 8) return 'Faible';
    if (met <=2) return 'Moyen';
    if (met >=3) return 'Bon';
    return 'Bon';
  }

  newPwdInput.addEventListener('input', () => {
    const s = evalStrength(newPwdInput.value);
    pwdStrengthText.textContent = s ? `Force: ${s}` : '';
  });

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    passwordFeedback.textContent = '';
    const userId = user.userId || user.id;
    if (!userId) { alert('Identifiant utilisateur manquant'); return; }
    const currentPassword = currentPwdInput.value;
    const newPassword = newPwdInput.value;
    const confirmPassword = confirmPwdInput.value;
    if (!currentPassword || !newPassword || !confirmPassword) {
      passwordFeedback.textContent = 'Tous les champs sont requis';
      passwordFeedback.className = 'text-danger';
      return;
    }
    if (newPassword.length < 8) {
      passwordFeedback.textContent = 'Le nouveau mot de passe doit contenir au moins 8 caractères';
      passwordFeedback.className = 'text-danger';
      return;
    }
    if (newPassword !== confirmPassword) {
      passwordFeedback.textContent = 'Les mots de passe ne correspondent pas';
      passwordFeedback.className = 'text-danger';
      return;
    }
    try {
      const resp = await fetch('/api/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, currentPassword, newPassword })
      });
      const jr = await resp.json().catch(()=>null);
      if (resp.ok) {
        passwordFeedback.textContent = 'Mot de passe mis à jour';
        passwordFeedback.className = 'text-success';
        currentPwdInput.value = '';
        newPwdInput.value = '';
        confirmPwdInput.value = '';
        pwdStrengthText.textContent = '';
      } else {
        passwordFeedback.textContent = (jr && jr.message) ? jr.message : 'Erreur changement de mot de passe';
        passwordFeedback.className = 'text-danger';
      }
    } catch (err) {
      passwordFeedback.textContent = 'Erreur réseau';
      passwordFeedback.className = 'text-danger';
    }
  });
});