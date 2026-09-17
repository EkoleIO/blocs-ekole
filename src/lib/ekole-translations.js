/**
 * Blocs Ékole: French strings that TurboWarp's translations do not provide yet
 * (or that name TurboWarp in the text). Mixed in after the TurboWarp translations.
 * Scratch's own French UI strings use "vous", so these do too.
 */
const ekoleTranslations = {
    fr: {
        'tw.menuBar.addons': 'Modules',
        'tw.menuBar.restorePoints': 'Points de restauration',
        'tw.menuBar.reportError1': 'Certains scripts ont rencontré des erreurs.',
        'tw.menuBar.accent': 'Couleur d\'accent',
        'tw.menuBar.blockColors': 'Couleurs des blocs',
        'tw.blockColors.three': 'Originales',
        'tw.blockColors.dark': 'Sombres (bêta)',
        'tw.blockColors.custom': 'Personnaliser dans les modules',
        'tw.gui.crashMessage.description':
            'Nous sommes vraiment désolés, mais la page a planté. Veuillez actualiser la page pour réessayer.',
        'tw.restorePoints.title': 'Points de restauration',
        'tw.restorePoints.never': 'jamais',
        'tw.restorePoints.1minute': 'chaque minute',
        'tw.restorePoints.minutes': 'toutes les {n} minutes',
        'tw.restorePoints.description':
            '{APP_NAME} enregistre régulièrement des points de restauration sur votre ordinateur pour aider à ' +
            'récupérer votre projet si vous oubliez de l\'enregistrer. C\'est un dernier recours : votre ' +
            'ordinateur peut effacer ces points de restauration à tout moment. NE COMPTEZ PAS sur cette fonction.',
        'tw.restorePoints.intervalOption': 'Les points de restauration sont créés {time}.',
        'tw.restorePoints.off': 'Désactiver les points de restauration est dangereux.',
        'tw.restorePoints.error': 'Les points de restauration ne sont pas disponibles à cause d\'une erreur :',
        'tw.restorePoints.empty': 'Aucun point de restauration trouvé.'
    }
};

export default ekoleTranslations;
