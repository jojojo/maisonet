# Maiso’net — applications natives

L’interface React de `/mobile` est partagée avec les applications Capacitor 8.
Les écrans, la mascotte, le logo et les polices sont embarqués dans le paquet.
Les données nécessitent toujours une connexion à `https://maisonet.eoloa.net`.

## Projets

- Identifiant Android et iOS : `net.eoloa.maisonet`.
- Version courante : `0.1.2`, numéro de build `3`.
- Projets natifs : `android/` et `ios/`.
- Entrée embarquée : `mobile/index.html` et `resources/js/mobile/native-main.tsx`.
- Sortie Vite : `mobile/dist/`, générée et ignorée par Git.
- Configuration native : `capacitor.config.ts` ; aucun `server.url` distant.
- Configuration de compilation : `vite.mobile.config.ts`, sans chargement du `.env` Laravel.

## Compilation et test Android

Prérequis locaux : Node 22+, JDK 21 et SDK Android avec plateforme 36.
Installer Android Studio pour configurer le SDK et un téléphone/émulateur.

```sh
npm ci
npm run mobile:sync
npm run mobile:android
```

Pour construire sans ouvrir Android Studio :

```sh
cd android
./gradlew assembleDebug
# Windows : .\gradlew.bat assembleDebug
```

APK généré : `android/app/build/outputs/apk/debug/app-debug.apk`.
Installation sur un téléphone connecté en mode débogage USB :

```sh
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

La génération automatique des APK est temporairement suspendue. Le workflow
GitHub Actions **Android APK** reste disponible sur déclenchement manuel : il construit le paquet et
le lance sur un émulateur Android 35. Il vérifie l’ouverture de l’écran de
connexion et conserve une capture. Les artefacts `maisonet-android-debug`
(APK) et `maisonet-android-launch` (capture) sont disponibles 14 jours dans
le résultat du workflow. Aucun compte ni secret de production n’est injecté.

Les téléchargements publics des APK de test sont suspendus. Les fichiers
existants sont archivés dans le volume privé du serveur, en dehors de Git
et de la base de données, pour pouvoir reprendre la distribution plus tard.

L’APK est une version de test signée avec la clé debug du runner. Cette clé
n’est pas stable entre les machines de compilation : une nouvelle compilation
peut demander la désinstallation de l’ancienne version. Pour une distribution
durable et les mises à jour, il faudra définir une signature de publication
conservée en dehors du dépôt. Aucun secret de signature n’est versionné.

## iPhone et iPad

Le projet Xcode utilise Swift Package Manager. Sur un Mac équipé de Xcode 26+ :

```sh
npm ci
npm run mobile:ios
```

Choisir un simulateur ou une équipe de signature pour un appareil réel.
La génération du projet sous Windows ne constitue pas une compilation iOS.
La distribution TestFlight/App Store demandera une équipe Apple et les réglages
de signature correspondants. Aucun compte Apple n’est configuré ici.

## Visuels

Les trois images fournies dans `public/Image ChatGPT…` sont conservées telles
quelles. Le logo horizontal est utilisé via `public/logo.png`, la mascotte avec
sa liste via `public/mascot.png`, et l’icône simplifiée via `public/icon.png`.
Le composant `HouseBuddy` partage la mascotte entre le site et l’application.
La compilation native embarque le logo et la mascotte sans charger ces images
depuis le serveur.

Pour régénérer les icônes PWA, Android et iOS sous Windows :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/generate-brand-icons.ps1
```

Le script conserve les originaux, ajuste les marges transparentes pour les
petites tailles et produit les icônes sur fond opaque, y compris l’icône iOS
1024×1024. Les rendus générés sont versionnés avec les projets natifs.

## Connexion et confidentialité

Les comptes et permissions restent gérés par Laravel et Sanctum. Le jeton
Bearer expire après 30 jours. Sur appareil natif, le plugin
`@aparajita/capacitor-secure-storage` utilise Android Keystore/AES-GCM ou le
Keychain iOS. La synchronisation iCloud est désactivée ; les éléments iOS
restent liés à l’appareil. Le stockage navigateur n’est pas utilisé en natif.

L’ouverture du coffre est asynchrone. En cas d’échec, l’app propose de réessayer
sans se rabattre sur un stockage en clair. Si l’enregistrement d’un nouveau
jeton échoue, l’app tente de le révoquer immédiatement. Une coupure réseau
ne supprime pas une session valide ; une réponse `401` la supprime. La
déconnexion révoque le jeton côté serveur puis efface la session locale.

L’API passe par `CapacitorHttp`, vers une origine HTTPS fixe, sans redirections
automatiques. Cela évite d’élargir CORS côté Laravel. Les requêtes annulées ne
mettent plus à jour l’interface ; l’opération HTTP native déjà partie peut
néanmoins finir côté serveur. Les contrôles d’idempotence restent côté Laravel.

Les liens d’inscription, de mot de passe oublié et du site complet s’ouvrent
dans le navigateur système. Ils ne transportent aucun jeton ; la connexion web
est indépendante. Le bouton retour Android ferme la fenêtre de mission,
revient aux missions depuis un autre onglet, puis minimise l’app. Le retour
au premier plan actualise les missions si aucune action n’est en cours.

La journalisation native et l’inspection WebView sont désactivées afin de ne pas
exposer les paramètres du coffre ni les réponses d’authentification. Les
sauvegardes Android sont désactivées. Pas de clé Portainer, de `.env`, de base
SQLite, ni de données de comptes dans les ressources embarquées.

## Vérifications

```sh
npx tsc --project tsconfig.mobile.json --noEmit
node --experimental-strip-types --test tests/frontend/mobile-api.test.mjs tests/frontend/mobile-session.test.mjs
npm run mobile:sync
```

Les notifications push, la synchronisation hors connexion et la publication
sur les stores restent des étapes séparées. Avant une publication, tester
notamment la connexion, le redémarrage de l’app, la validation parentale et la
déconnexion sur de vrais appareils Android et iOS.

Références : [Capacitor](https://capacitorjs.com/docs),
[prérequis](https://capacitorjs.com/docs/getting-started/environment-setup),
[transport HTTP](https://capacitorjs.com/docs/apis/http),
[stockage sécurisé](https://github.com/aparajita/capacitor-secure-storage).
