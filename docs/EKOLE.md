# Blocs Ékole — journal de fork

Fork auto-hébergé de TurboWarp/scratch-gui pour le club de code primaire Ékole (9-11 ans, français, Chrome).
Travail LOCAL uniquement : pas de dépôt GitHub créé, pas de push, pas de déploiement (le lead s'en charge).

## Amont figé

- Dépôt : https://github.com/TurboWarp/scratch-gui (branche `develop`), remote local renommé `upstream`.
- Commit figé : `25c11c6f246de9c6d36b29a61c505cd35f34cb8c` (2026-09-14, « Add support for DMCA takedowns (#1194) »).
- Branche Ékole : `ekole/main` (historique amont conservé).
- Dépendances `github:TurboWarp/scratch-vm#develop` etc. : figées par `package-lock.json` (commits résolus).

## Décisions (ne pas rediscuter)

- Nom « Blocs Ékole » (jamais « Scratch » comme nom : marque).
- Servi sous `/blocs/` de l'origine Classify4Kids (https://ekole-classify4kids.netlify.app/blocs/, proxy Netlify) → même stockage navigateur que C4K.
- Extension C4K : `/scratch/extension.js` sur la même origine, chargée hors sandbox sans invite.

## Journal

### 2026-09-16
- Clone (6 min, historique complet 435 Mo), remote `upstream`, branche `ekole/main`.
- `.nvmrc` amont = v24 mais la CI TurboWarp (`.github/workflows/node.js.yml`) utilise Node 22 → on build avec `npx -y -p node@22 -- …` (Node 22.23.2). Node local = 20.
- `npx -y -p node@22 -- npm ci --no-audit --no-fund` : OK en 3 min 19 s (1932 paquets ; le script `prepublish` télécharge le .hex micro:bit dans `static/microbit`, ignoré par git).
- Build de référence AVANT patchs : `NODE_ENV=production ROOT=/blocs/ CI=1 npx -y -p node@22 -- npm run build` → 31 s (98 s CPU), `build/` = 24 Mo, 0 fichier .map (devtool=false en production). Le build de production génère aussi `dist/` (bibliothèque UMD, 17 Mo) : inutile pour le site, ne pas publier.

### Constats de lecture du code (pour reprendre)
- Nom centralisé : `src/lib/brand.js` (APP_NAME), utilisé par webpack (titres) et ~20 composants.
- `index.html` = page d'accueil « player » TurboWarp (projets vedettes, pied de page) ; `editor.html` = éditeur. Routage `filehash` (`src/lib/tw-state-manager-hoc.jsx`) : le dossier = player, `editor.html` = éditeur → pour servir l'éditeur à `/blocs/`, il faut que le dossier soit l'éditeur (sinon « Précédent » bascule en mode player).
- Sécurité extensions : `src/containers/tw-security-manager.jsx` (`isTrustedExtension` → `getSandboxMode` 'unsandboxed' + `canLoadExtensionFromProject` sans invite). La VM (`node_modules/scratch-vm/src/virtual-machine.js` `_loadExtensions`) saute une extension dont l'ID est déjà chargé, et `installTargets` attend `allAsyncExtensionsLoaded()` → charger l'extension au démarrage suffit pour les projets qui la référencent (quelle que soit l'URL enregistrée).
- Langue : `src/lib/detect-locale.js` (localStorage `tw:language` > navigateur > `?locale=`), défaut 'en'.
- Traductions TurboWarp fr : `src/lib/tw-translations/generated-translations.json` ; quelques libellés du menu n'y sont pas (« Restore points », « Addons ») → surcharge Ékole.
- Extension C4K (`classify4kids` repo, branche qa/2026-09-16-c4k-v2, `public/scratch/extension.js`) : id `classify4kids`, catégorie **« Classify4Kids »** ; blocs « charger le projet [KEY] », « reconnaître l’image de la webcam », « classe reconnue », « confiance (%) », « la classe est [NAME] ? », « état du modèle ». Lecture IndexedDB seulement si `location.origin === 'https://classify4kids.netlify.app'` ou hôte localhost/127.0.0.1 → **sur https://ekole-classify4kids.netlify.app la lecture sans clé ne se déclenchera pas** (à corriger côté C4K).
- Réseau : bibliothèques de sprites/sons via `cdn.assets.scratch.mit.edu` ; variables cloud → `wss://clouddata.turbowarp.org` ; galerie d'extensions → `extensions.turbowarp.org` ; windchimes désactivé (env `ENABLE_WINDCHIMES` vide).
