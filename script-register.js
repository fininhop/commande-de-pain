// script-register.js - Validation et enregistrement utilisateur avec mot de passe

// Regex pour téléphone français (commence par 0, suivi de 9 chiffres)
const FRENCH_PHONE_REGEX = /^0[0-9]{9}$/;
// Regex pour email
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validation des champs
function validateName(name) {
    const trimmed = name.trim();
    if (trimmed.length < 3) return 'Le nom doit contenir au moins 3 caractères';
    return null;
}

function validateEmail(email) {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmed)) return 'Email invalide';
    return null;
}

function validatePhone(phone) {
    const trimmed = phone.replace(/[\s-]/g, '');
    if (!FRENCH_PHONE_REGEX.test(trimmed)) {
        return 'Format téléphone français invalide (ex: 0603531414)';
    }
    return null;
}

function validateAddress(address) {
    const trimmed = address.trim();
    if (trimmed.length < 5) return 'L\'adresse doit contenir au moins 5 caractères';
    return null;
}

function validatePassword(password) {
    if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères';
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    const strength = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    if (strength < 2) return 'Mot de passe trop faible (min: majuscule + chiffre OU caractères spéciaux)';
    return null;
}

function getPasswordStrength(password) {
    if (password.length < 8) return { level: 'weak', text: 'Faible' };
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    const strength = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    if (strength <= 2) return { level: 'weak', text: 'Faible' };
    if (strength === 3) return { level: 'fair', text: 'Moyen' };
    return { level: 'good', text: 'Bon' };
}

function validatePasswordMatch(pwd, confirm) {
    if (pwd !== confirm) return 'Les mots de passe ne correspondent pas';
    return null;
}

// Afficher/masquer les erreurs
function showError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const errorDiv = document.getElementById(errorId);
    if (message) {
        input.classList.add('is-invalid');
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
    } else {
        input.classList.remove('is-invalid');
        errorDiv.textContent = '';
        errorDiv.classList.remove('show');
    }
}

// Validation en temps réel
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    const nameInput = document.getElementById('regName');
    const emailInput = document.getElementById('regEmail');
    const phoneInput = document.getElementById('regPhone');
    const addrLine1 = document.getElementById('regAddrLine1');
    const addrLine2 = document.getElementById('regAddrLine2');
    const addrPostal = document.getElementById('regPostal');
    const addrCity = document.getElementById('regCity');
    const addrDept = document.getElementById('regDept');
    const passwordInput = document.getElementById('regPassword');
    const confirmInput = document.getElementById('regConfirmPassword');
    const msg = document.getElementById('regMessage');

    // Validation en temps réel
    nameInput.addEventListener('blur', () => {
        const error = validateName(nameInput.value);
        showError('regName', 'nameError', error);
    });

    emailInput.addEventListener('blur', () => {
        const error = validateEmail(emailInput.value);
        showError('regEmail', 'emailError', error);
    });

    phoneInput.addEventListener('blur', () => {
        const error = validatePhone(phoneInput.value);
        showError('regPhone', 'phoneError', error);
    });

    addrLine1.addEventListener('blur', () => {
        const error = validateAddress(addrLine1.value);
        showError('regAddrLine1', 'addressError', error);
    });
    addrPostal.addEventListener('blur', () => {
        const ok = /^\d{5}$/.test((addrPostal.value||'').trim());
        showError('regPostal', 'addressError', ok ? null : 'Code postal à 5 chiffres requis');
    });
    addrCity.addEventListener('blur', () => {
        const ok = (addrCity.value||'').trim().length >= 2;
        showError('regCity', 'addressError', ok ? null : 'Ville requise');
    });

    passwordInput.addEventListener('input', () => {
        const pwd = passwordInput.value;
        if (pwd) {
            const strength = getPasswordStrength(pwd);
            const strengthDiv = document.getElementById('passwordStrength');
            strengthDiv.textContent = `Force: ${strength.text}`;
            strengthDiv.className = `password-strength strength-${strength.level}`;
        }
        const error = validatePassword(pwd);
        showError('regPassword', 'passwordError', error);
    });

    confirmInput.addEventListener('blur', () => {
        const error = validatePasswordMatch(passwordInput.value, confirmInput.value);
        showError('regConfirmPassword', 'confirmError', error);
    });

    // Soumission du formulaire
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        msg.textContent = '';
        const submitBtn = form.querySelector('button[type="submit"]');

        const name = nameInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const phone = phoneInput.value.replace(/[\s-]/g, '');
        const address = {
            line1: (addrLine1.value||'').trim(),
            line2: (addrLine2.value||'').trim(),
            postalCode: (addrPostal.value||'').trim(),
            city: (addrCity.value||'').trim(),
            department: (addrDept.value||'').trim()
        };
        const password = passwordInput.value;
        const confirm = confirmInput.value;

        // Validation complète
        const nameErr = validateName(name);
        const emailErr = validateEmail(email);
        const phoneErr = validatePhone(phone);
        const addressErr = validateAddress(address.line1);
        const passwordErr = validatePassword(password);
        const confirmErr = validatePasswordMatch(password, confirm);

        showError('regName', 'nameError', nameErr);
        showError('regEmail', 'emailError', emailErr);
        showError('regPhone', 'phoneError', phoneErr);
        showError('regAddrLine1', 'addressError', addressErr);
        const postalErr = /^\d{5}$/.test(address.postalCode) ? null : 'Code postal à 5 chiffres requis';
        showError('regPostal', 'addressError', postalErr);
        const cityErr = address.city.length >= 2 ? null : 'Ville requise';
        showError('regCity', 'addressError', cityErr);
        showError('regPassword', 'passwordError', passwordErr);
        showError('regConfirmPassword', 'confirmError', confirmErr);

        if (nameErr || emailErr || phoneErr || addressErr || postalErr || cityErr || passwordErr || confirmErr) {
            return;
        }

        try {
            if (submitBtn) submitBtn.classList.add('btn-loading');
            disableForm(form);
            showPageLoader('Création du compte…');
            // Envoyer le mot de passe au serveur (qui le hashera avec bcryptjs côté serveur)
            const response = await fetch('/api/save-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    phone,
                    address,
                    password // Le serveur hashera le mot de passe
                })
            });

            let result = null;
            try {
                result = await response.json();
            } catch (parseErr) {
                const text = await response.text().catch(() => '');
                try { result = JSON.parse(text); } catch { result = { message: text || 'Réponse serveur invalide' }; }
            }

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
                if (response.status >= 500) {
                    msg.innerHTML = '<div class="alert alert-danger">Erreur serveur, réessayez plus tard.</div>';
                } else {
                    msg.innerHTML = '<div class="alert alert-danger">Erreur: ' + (result && result.message ? result.message : 'Erreur inconnue') + '</div>';
                }
            }

        } catch (err) {
            console.error('Erreur enregistrement:', err);
            msg.innerHTML = '<div class="alert alert-danger">Erreur réseau. Réessayez.</div>';
        } finally {
            if (submitBtn) submitBtn.classList.remove('btn-loading');
            enableForm(form);
            hidePageLoader();
        }
    });
});
