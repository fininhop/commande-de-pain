const firebaseConfig = {
    apiKey: 'VOTRE_NEXT_PUBLIC_FIREBASE_API_KEY_ICI',
    authDomain: 'VOTRE_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_ICI',
    projectId: 'VOTRE_NEXT_PUBLIC_FIREBASE_PROJECT_ID_ICI',
    appId: 'VOTRE_NEXT_PUBLIC_FIREBASE_APP_ID_ICI'
};

// Prix unitaires par nom d'article (modifiable)
// Prix unitaires par nom d'article (modifiable)
window.NAME_PRICES = window.NAME_PRICES || {
    // Format générique
    "Pain 1kg": 4.50,
    "Pain 500g": 2.50,
    "Baguette": 1.20,
    // Formats détaillés (ancien mapping admin)
    'Blanc 400g': 3.60,
    'Blanc 800g': 6.50,
    'Blanc 1kg': 7.00,
    'Complet 400g': 3.60,
    'Complet 800g': 6.50,
    'Complet 1kg': 7.00,
    'Céréale 400g': 4.60,
    'Céréale 800g': 8.50,
    'Céréale 1kg': 9.00,
    'Épeautre 400g': 4.60,
    'Épeautre 800g': 8.50,
    'Épeautre 1kg': 9.00,
    'Sarrazin': 7.00
};

// Poids unitaires par nom d'article en kg (optionnel)
window.NAME_WEIGHTS = window.NAME_WEIGHTS || {
    "Pain 1kg": 1.0,
    "Pain 500g": 0.5,
    "Baguette": 0.250,
    // Formats détaillés pour correspondre aux libellés utilisés
    'Blanc 400g': 0.400,
    'Blanc 800g': 0.800,
    'Blanc 1kg': 1.000,
    'Complet 400g': 0.400,
    'Complet 800g': 0.800,
    'Complet 1kg': 1.000,
    'Céréale 400g': 0.400,
    'Céréale 800g': 0.800,
    'Céréale 1kg': 1.000,
    'Épeautre 400g': 0.400,
    'Épeautre 800g': 0.800,
    'Épeautre 1kg': 1.000,
    'Sarrazin': 1.000
};
