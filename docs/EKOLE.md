# Blocs Ékole — journal de fork

Fork auto-hébergé de TurboWarp/scratch-gui pour le club de code primaire Ékole (9-11 ans, français, Chrome).
Travail LOCAL uniquement : pas de dépôt GitHub créé, pas de push, pas de déploiement (le lead s'en charge).

**État au 2026-09-16 : fork fonctionnel, testé en local sur la même origine que Classify4Kids v2 (21/21).
Reste : publier le code, déployer, corriger l'origine dans l'extension C4K (voir « Reste à faire »).**

## Amont figé

- Dépôt : https://github.com/TurboWarp/scratch-gui (branche `develop`), remote local renommé `upstream`.
- Commit figé : `25c11c6f246de9c6d36b29a61c505cd35f34cb8c` (2026-09-14, « Add support for DMCA takedowns (#1194) »).
- Branche Ékole : `ekole/main` (historique amont conservé).
- Dépendances `github:TurboWarp/scratch-vm#develop`, `scratch-blocks`, `scratch-render`… : figées par `package-lock.json`.
- Mise à jour amont plus tard : `git fetch upstream && git merge upstream/develop` sur une branche, puis rejouer les tests ci-dessous.

## Décisions (ne pas rediscuter)

- Nom « Blocs Ékole » (jamais « Scratch » comme nom : marque).
- Servi sous `/blocs/` de l'origine Classify4Kids (https://ekole-classify4kids.netlify.app/blocs/, proxy Netlify) → même stockage navigateur que C4K.
- Extension C4K : `/scratch/extension.js` sur la même origine, chargée hors sandbox sans invite.
- Mention : « Blocs Ékole — basé sur TurboWarp et sur Scratch du MIT Media Lab. Compatible avec les projets Scratch 3 (.sb3). Non affilié à la Scratch Foundation. » + lien « Code source » → https://github.com/EkoleIO/blocs-ekole (GPL-3.0).

## Construire

```sh
npx -y -p node@22 -- npm ci --no-audit --no-fund            # 3 min 19 s
NODE_ENV=production ROOT=/blocs/ CI=1 npx -y -p node@22 -- npm run build   # 27 à 33 s
npx -y -p node@22 -- npm run test:unit                      # 56 tests (dont 23 Ékole)
```

- Node : `.nvmrc` amont = v24, mais la CI TurboWarp (`.github/workflows/node.js.yml`) est en Node 22 → build fait avec Node 22.23.2 via `npx -p node@22` (Node local = 20). `CI=1` masque seulement la barre de progression.
- Sortie à publier : **`build/` uniquement** = 19,9 Mio, 402 fichiers, **0 fichier .map** (en production `devtool` = false ; ne pas définir `SOURCEMAP`). JS initial de `/blocs/` : 6,85 Mio brut, 1,67 Mio gzip.
- Le build de production génère aussi `dist/` (bibliothèque UMD, 17 Mo) : ne pas publier.
- Référence avant patchs (même commande) : 31 s, 24 Mo.
- Les chemins du build sont absolus (`/blocs/js/…`) : le site doit être servi exactement sous `/blocs/`.
- Reproductibilité vérifiée : clone neuf de `ekole/main` → `npm ci` (57 s, cache npm chaud) → build 31 s → mêmes 402 fichiers, mêmes noms à hash de contenu que le build local.

## Patchs (commits sur `ekole/main`)

1. `chore` — ce journal + bloc `.gitignore` Ékole. Hook pre-commit Ékole copié dans `.git/hooks/` (non versionné : à recopier après un nouveau clone, `cp <racine Ékole>/.githooks/pre-commit .git/hooks/`).
2. `feat: rebrand` — `src/lib/brand.js` (APP_NAME, SOURCE_CODE_URL, ABOUT_TEXT) ; logo original `static/images/blocs-ekole.svg` (blocs empilés aux couleurs Ékole ; favicon.ico 16/32/48, 192.png, 512.png, apple-touch-icon rendus depuis le SVG avec Chrome headless + Pillow) ; `menu-bar.jsx/.css` (logo + nom → page À propos, bouton « Code source » à la place de « TurboWarp Feedback », menu d'erreurs sans lien vers le développeur TurboWarp) ; `credits.jsx` (section française avec la mention + lien code source ; crédits TurboWarp/Scratch conservés ; lien de don retiré) ; `index.ejs`/`simple.ejs` (lang fr, favicon, splash et erreurs en français, accent violet) ; `webpack.config.js` (titres) ; `render-interface.jsx` (titre = nom seul) ; `extensions/index.jsx` + `tw-extension-tags.js` (la galerie et les blocs TurboWarp gardent le nom « TurboWarp ») ; `addons/settings/settings.jsx` (lien « Addon Feedback » retiré) ; `themes/index.js` (accent violet par défaut) ; `static/privacy.html` (politique de turbowarp.org) supprimé ; `manifest.webmanifest`.
3. `feat: français par défaut` — `src/lib/detect-locale.js` : langue enregistrée par le menu (`tw:language`) > `?locale=`/`?lang=` > **fr** ; la langue du navigateur est ignorée. `src/lib/ekole-translations.js` (fusionné dans `tw-translations/index.js`) : libellés fr absents chez TurboWarp. Test amont `test/unit/util/detect-locale.test.js` remplacé par `test/unit/ekole/detect-locale.test.js` ; `npm run test:unit` inclut `test/unit/ekole`.
4. `feat: extension de confiance` — `src/lib/ekole-extension.js` + `src/containers/tw-security-manager.jsx` :
   - `isTrustedSameOriginExtension(url)` : script http(s) de la **même origine** sous `/scratch/` (segments simples, aucun caractère encodé, pas d'identifiants) → `isTrustedExtension` → hors sandbox, sans invite, aussi quand un projet le référence. Toutes les autres extensions gardent sandbox + invites.
   - `loadEkoleExtension(vm)` : `HEAD /scratch/extension.js` puis `vm.extensionManager.loadExtensionURL()`, une fois par VM, lancé par le gestionnaire de sécurité **dès que l'interface affiche un projet (ou une erreur)**, jamais pendant un chargement de projet : la VM fait attendre les projets sur les extensions en cours, donc un échec ferait échouer le projet et une même URL demandée en parallèle serait chargée deux fois (constat de la revue de code, corrigé au commit 8). Le HEAD évite de demander à la VM un script absent. Un projet ouvert ensuite qui référence l'id `classify4kids` (quelle que soit l'URL enregistrée, ex. l'ancienne `https://classify4kids.netlify.app/scratch/extension.js`) trouve l'extension déjà chargée ; au réenregistrement, l'URL devient celle de la même origine.
   - Tests : `test/unit/ekole/ekole-extension.test.js`.
5. `feat: éditeur à /blocs/` — `webpack.config.js` (index.html = éditeur ; pages player et fullscreen non générées), `tw-state-manager-hoc.jsx` (FileHashRouter : dossier et editor.html = éditeur, plein écran sans changer d'URL), `render-gui.jsx` (pas de bouton « Voir la page du projet »).
6. `fix` — `render-interface.jsx` : plus de « Empaqueter le projet » (packager.turbowarp.org) ; `tw.lightMode` corrigé (« Baculer » → « Basculer »).
7. `test: e2e` — `test/ekole-e2e/e2e-blocs.mjs` (mode d'emploi en tête du fichier) et `make-sprite3.mjs`.
8. `fix` (revue de code) — `tw-security-manager.jsx` : chargement de l'extension quand aucun projet ne se charge (voir 4).

### Revue de code (agent code-reviewer, 2026-09-16)
- `isTrustedSameOriginExtension` : aucun contournement trouvé (points encodés, antislash, identifiants, ports, IPv6, point final, majuscules, data:/blob:/file:, http↔https).
- HIGH ×2 (échec tardif qui fait échouer un projet en cours ; double chargement avec `?extension=` ou un projet de même URL) → corrigés par le commit 8 ; vérifié : `?extension=<même URL>` → une seule catégorie.
- MEDIUM (accepté) : `canFetch` fait aussi confiance à `/scratch/` pour les autres extensions. Sans effet réel : `canFetch` n'est consulté que par les extensions hors sandbox, qui ont déjà accès à toute la page, et ces fichiers sont publics sur la même origine.
- LOW (amont) : `test/integration/*.test.js` visent `build/player.html`, absent aussi chez TurboWarp ; tests Selenium non lancés par la CI.

## Libellés exacts (build du 2026-09-16, Chrome for Testing, navigateur réglé en anglais)

| Zone | Libellés |
|---|---|
| Barre de menus | logo « Blocs Ékole » · « Paramètres » · « Fichier » · « Modifier » · « Modules » · « Avancé » · titre « Projet » · bouton « Code source » |
| Menu Fichier (Chrome) | « Nouveau » · « Importer depuis votre ordinateur » · « Enregistrer sous... » · « Enregistrer dans un fichier séparé... » · « Points de restauration » |
| Menu Fichier, après un premier « Enregistrer sous... » | + « Sauvegarder sous {nom du fichier} » (traduction TurboWarp `tw.saveTo`) |
| Menu Fichier, navigateur sans File System Access API | « Sauvegarder sur votre ordinateur » à la place des deux « Enregistrer… » |
| Charger par-dessus un projet modifié | « Remplacer le contenu du projet actuel ? » |
| Bouton des sprites | « Choisir un sprite » → « Importer un sprite » · « Surprise » · « Peindre » · « Choisir un sprite » |
| Catégories | Mouvement · Apparence · Son · Événements · Contrôle · Capteurs · Opérateurs · Variables · Mes Blocs · **Classify4Kids** (en dernier) |
| Blocs de l'extension (catégorie « Classify4Kids ») | « charger le projet [ABC234] » · « reconnaître l’image de la webcam » · « classe reconnue » · « confiance (%) » · « la classe est [saute] ? » · « état du modèle » (→ « prêt (2 classes, navigateur) ») |
| Menu Paramètres | « Langue » (menu conservé) · « Basculer sur le mode sombre » · « Couleurs des blocs » · « Couleur d'accent » |
| Page À propos (`/blocs/credits.html`) | « À propos de Blocs Ékole », mention complète, lien « Code source » |

## Tests (2026-09-16)

- Unitaires : `npm run test:unit` → **56/56** (23 Ékole : langue, origines de confiance, chemins piégés `..`/`%2e%2e`/`%2F`/`%5c`, autre origine, http↔https, `data:`, URL relative, HEAD 404/hors ligne, échec puis nouvel essai, chargement unique).
- Lint : aucune nouvelle erreur ESLint dans les fichiers modifiés. `eslint . --ext .js,.jsx` sur tout le dépôt = 38 erreurs, toutes amont (settings-store.js, menu-bar.jsx ×25, monitor.jsx, sound-library.jsx, file-uploader.js) ; la CI TurboWarp ne lance pas le lint.
- **e2e même origine** (`test/ekole-e2e/e2e-blocs.mjs`, site local = `public/` de C4K v2 à la racine + `build/` sous `blocs/`, `python3 -m http.server 8123`, webcam factice) : **21/21, cinq fois** (dont une après le correctif de revue).
  - (a) C4K : étiquettes saute/rien, 5 photos webcam chacune, « 🧠 Apprendre » → « Modèle à jour ✓ — 10 exemples appris. Teste-le ! », modèle `c4k-knn` dans IndexedDB `c4k`.
  - (b) `/blocs/` : titre « Blocs Ékole », UI en français malgré un navigateur en anglais, extension `unsandboxed.0.classify4kids`, aucune modale ni boîte de dialogue, catégorie en dernier, blocs en français. Projet minimal (drapeau vert → charger le projet → reconnaître → variables) qui référence l'ANCIENNE URL C4K : « classe reconnue » = **rien (60 %)**, **saute (80 %)**, **rien (60 %)**, **rien (60 %)**, **saute (60 %)** selon le passage ; « état du modèle » = « prêt (2 classes, navigateur) » → le détecteur vient bien d'IndexedDB (pas de clé). Projet réenregistré avec `http://localhost:8123/scratch/extension.js`.
  - (c) Fichier → « Importer depuis votre ordinateur » : kit `fin-seance-09-et-10.sb3` chargé (Hero, Bug, Title ; titre « fin-seance-09-et-10 »). `showOpenFilePicker` est remplacé par un bouchon (Playwright ne pilote pas le sélecteur natif) : le menu et le chargement sont testés, pas la fenêtre de Chrome. « Importer un sprite » (vrai `<input type=file>`) : `mon-heros.sprite3` généré par ekole-sprite (« Partir du robot » → « Télécharger pour Scratch (.sprite3) ») → sprite « Héros », costumes course1/course2/saut.
  - Aucune erreur console. Hôtes externes contactés : cdn.jsdelivr.net, tfhub.dev, www.kaggle.com, storage.googleapis.com (TF.js + MobileNet de l'extension). Chargement de `/blocs/` en local : ~1,4 s.
- Fumée : `?extension=<URL de l'extension>` → une seule catégorie, aucune invite ; `/blocs/editor.html` → l'URL redevient `/blocs/` ; plein écran sans changement d'URL ; Précédent/Suivant restent dans l'éditeur ; `player.html`, `fullscreen.html`, `privacy.html` → 404 ; site SANS `/scratch/extension.js` → éditeur normal (projet par défaut, aucune modale) + avertissement console ; `addons.html` et `embed.html` sans erreur.
- Captures (`docs/captures/`, PNG 128 couleurs) : `01-editeur-1280x600.png`, `02-blocs-classify4kids.png`, `03-menu-fichier.png`.

## Risques ouverts

1. **Origine codée en dur dans l'extension C4K** : `isSameOrigin()` n'accepte que `https://classify4kids.netlify.app` et localhost. Servi depuis `https://ekole-classify4kids.netlify.app/blocs/`, le bloc « charger le projet » ne lira PAS IndexedDB et appellera `https://classify4kids.netlify.app/api/model?key=…` (autre origine). Le test local passe grâce à la règle localhost. **Vérifié** sur une origine non-localhost (`http://blocs.test:8123` → 127.0.0.1, même site) : Blocs Ékole charge bien l'extension hors sandbox sans invite, mais après un entraînement C4K sur cette origine, « état du modèle » = « erreur: Projet introuvable » (repli sur la clé). À corriger dans le dépôt classify4kids (ajouter l'origine réelle, ou comparer à l'origine du script) avant la mise en ligne.
2. **Réseau scolaire** : TF.js/MobileNet (cdn.jsdelivr.net, tfhub.dev → www.kaggle.com → storage.googleapis.com) ; bibliothèques de sprites/sons/arrière-plans depuis cdn.assets.scratch.mit.edu et assets.scratch.mit.edu ; galerie « Ajouter une extension » depuis extensions.turbowarp.org ; projets par numéro (`#123`) via trampoline.turbowarp.org.
3. **Variables cloud** : un projet avec une variable ☁ se connecte à `wss://clouddata.turbowarp.org` (pseudo aléatoire). Non modifié : à décider pour des mineurs (piste non testée : props `canUseCloud`/`hasCloudPermission` de `src/playground/render-gui.jsx`).
4. **GPL-3.0** : le lien « Code source » pointe vers un dépôt qui n'existe pas encore ; publier le code correspondant exact (tag du commit déployé) AVANT le déploiement. LICENSE, TRADEMARK, README amont et crédits TurboWarp conservés. L'extension C4K est chargée par URL à l'exécution (pas intégrée au bundle) : probablement une œuvre séparée, à confirmer.
5. **Marques** : les bibliothèques de sprites contiennent toujours le chat Scratch, Gobo, etc. (assets Scratch servis par le CDN de Scratch). « Scratch » reste employé pour désigner les projets/le langage (« Compatible avec les projets Scratch 3 », quelques libellés TurboWarp comme « Voir le projet sur Scratch »). Le sprite par défaut est le dango de TurboWarp (Twemoji, CC BY 4.0, attribution dans README).
6. **Confiance par chemin** : tout script déployé sous `/scratch/` sur l'origine C4K s'exécute avec les pleins droits dans Blocs Ékole : garder ce dossier sous revue.
7. **Extension qui plante** : si `extension.js` lève une exception avant `Scratch.extensions.register`, la VM attend indéfiniment et le chargement des projets reste bloqué (comportement amont ; le HEAD ne couvre que 404/réseau).
   Si le chargement échoue (réseau), ou pour un projet chargé AU DÉMARRAGE par paramètre d'URL (`?project_url=`, `#id`) avant que l'extension soit prête, un projet qui référence l'ANCIENNE URL `https://classify4kids.netlify.app/scratch/extension.js` retombe sur l'invite TurboWarp (sandbox, caméra bloquée) ; recharger la page suffit (un projet enregistré depuis Blocs Ékole a l'URL de la même origine et se charge sans invite). Fenêtre théorique restante : ouvrir un fichier dans les ~100 ms qui suivent l'affichage de l'éditeur.
8. `sw.js` est émis mais n'est enregistré que si `ENABLE_SERVICE_WORKER` est défini (ne pas le définir sous `/blocs/` sans étudier le cache).
9. Pages de test amont `embedtest.html`/`embedtestbad.html` et `robots.txt` publiés sous `/blocs/` (inoffensifs).
10. Ne pas intégrer `/blocs/` dans une iframe : TurboWarp affiche alors sa page « Invalid … Embed » (non traduite, liens TurboWarp) ; `embed.html` est la seule page prévue pour l'iframe.

## Reste à faire (prochaines étapes exactes)

1. **Lead** — créer le dépôt public `EkoleIO/blocs-ekole` puis :
   `git -C Apps/panel/blocs-ekole remote add origin git@github.com:EkoleIO/blocs-ekole.git && git -C Apps/panel/blocs-ekole push -u origin ekole/main` (la CI amont lancera `npm ci`, `npm run build`, `npm run test:unit`).
2. **Classify4Kids** — dans `public/scratch/extension.js`, faire accepter l'origine qui sert `/blocs/` par `isSameOrigin()` (et `ORIGIN` pour la clé) ; mettre à jour l'étape 3 « Utiliser dans les blocs » (lien `/blocs/`, plus de case « Exécuter sans la sandbox »).
3. **Déploiement** — site statique séparé dont le dossier publié contient `blocs/` (= contenu de `build/`), puis dans `netlify.toml` de C4K (+ redirection `/blocs` → `/blocs/`) :
   ```toml
   [[redirects]]
     from = "/blocs/*"
     to = "https://<site-blocs>.netlify.app/blocs/:splat"
     status = 200
   ```
   Utiliser `scripts/ekole-deploy.sh`, jamais `netlify deploy` nu. HTML sans cache, `js/pentapod/*` immuable.
4. **QA en ligne** — rejouer `test/ekole-e2e/e2e-blocs.mjs` avec `BASE=https://ekole-classify4kids.netlify.app` (après l'étape 2), puis Chrome d'un compte élève : caméra, pare-feu, sauvegarde « Enregistrer sous... ».
5. Décider des variables cloud (risque 3).

## Journal

### 2026-09-16
- Clone (6 min, historique complet 435 Mo), remote `upstream`, branche `ekole/main`.
- `npm ci` avec Node 22 : 3 min 19 s (1932 paquets ; `prepublish` télécharge le .hex micro:bit dans `static/microbit`, ignoré par git).
- Build de référence avant patchs : 31 s, 24 Mo.
- Lecture du code : nom centralisé (`brand.js`) ; `index.html` = accueil player et routage `filehash` (dossier = player) ; sécurité des extensions (`tw-security-manager.jsx`, `_loadExtensions` de la VM saute un id déjà chargé, `installTargets` attend les extensions en cours) ; langue (`detect-locale.js`, défaut 'en') ; traductions fr TurboWarp incomplètes (144 clés).
- Patchs 1 à 6, tests unitaires (TDD pour `ekole-extension.js`), build final 27 s, 19,9 Mio, 0 .map.
- e2e même origine 21/21 (quatre passages), fumée routage/404/extension absente, captures.
- Revue de code : 2 HIGH corrigés (commit 8), puis e2e 21/21 (5e passage : « saute », 60 %), fumées rejouées.
