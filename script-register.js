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
    const addressInput = document.getElementById('regAddress');
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

    addressInput.addEventListener('blur', () => {
        const error = validateAddress(addressInput.value);
        showError('regAddress', 'addressError', error);
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

        const name = nameInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const phone = phoneInput.value.replace(/[\s-]/g, '');
        const address = addressInput.value.trim();
        const password = passwordInput.value;
        const confirm = confirmInput.value;

        // Validation complète
        const nameErr = validateName(name);
        const emailErr = validateEmail(email);
        const phoneErr = validatePhone(phone);
        const addressErr = validateAddress(address);
        const passwordErr = validatePassword(password);
        const confirmErr = validatePasswordMatch(password, confirm);

        showError('regName', 'nameError', nameErr);
        showError('regEmail', 'emailError', emailErr);
        showError('regPhone', 'phoneError', phoneErr);
        showError('regAddress', 'addressError', addressErr);
        showError('regPassword', 'passwordError', passwordErr);
        showError('regConfirmPassword', 'confirmError', confirmErr);

        if (nameErr || emailErr || phoneErr || addressErr || passwordErr || confirmErr) {
            return;
        }

        try {
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

            const result = await response.json();
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
                msg.innerHTML = '<div class="alert alert-danger">Erreur: ' + (result.message || 'Erreur inconnue') + '</div>';
            }

        } catch (err) {
            console.error('Erreur enregistrement:', err);
            msg.innerHTML = '<div class="alert alert-danger">Erreur réseau. Réessayez.</div>';
        }
    });
});
