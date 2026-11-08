# Interface Bootstrap 5.3

La branche `bootstrap-5.3` utilise Bootstrap 5.3.8 et React Bootstrap 2.10.10. Les composants shadcn/ui, les dépendances Radix et Headless UI, Tailwind et son plugin Vite ont été retirés. Les actions et contrôleurs Laravel conservent leur fonctionnement.

Les vues migrées : connexion, inscription, mot de passe oublié et réinitialisation, confirmation du mot de passe, vérification d’adresse email ; tableau de bord ; planning ; tâches ; catalogue ; liste et détail des pièces ; membres ; foyer ; objectifs et validations parentales ; récompenses ; bibliothèque de jeux ; kiosque ; profil, mot de passe et apparence. La modale de l’interface mobile utilise également Bootstrap.

`resources/js/components/bootstrap/` contient les adaptateurs React pour les boutons, champs, cartes, badges et modales. Les modales et le menu mobile utilisent React Bootstrap pour la gestion du focus, du clavier, du défilement et du fond de page. Les classes des vues sont celles de Bootstrap, complétées par les mises en page spécifiques de Maiso’net dans `resources/css/maisonet-layout.css` et sa charte dans `resources/css/app.css` : couleurs, personnages, montagnes et dimensions des terrains de jeu.

Les couleurs clair/sombre suivent `data-bs-theme`. La police Nunito est incluse dans les fichiers compilés. Aucun CDN n’est nécessaire. Le kiosque HTML compatible reste autonome.

Validation : compilation web et mobile, TypeScript, ESLint, tests PHP et JavaScript ; parcours navigateur des vues métier à 375, 768 et 1280 pixels, ouverture/fermeture des modales et protection du kiosque. Les essais locaux utilisent une copie isolée de la base.

L’essai iPad s’ouvre via `/essai-ipad`, qui conserve le choix d’affichage dans la session et maintient le verrouillage du kiosque. Le lien HTML « Version de secours » reste utilisable si React ne démarre pas. Sans ce choix, l’ancien iPad garde le kiosque compatible par défaut.

Le JavaScript commun est compilé pour Safari/iOS 12. Core-js, IntersectionObserver et ResizeObserver complètent les API absentes ; les commandes des jeux passent par touch/mouse quand Pointer Events manque et le canvas ne dépend pas de `roundRect`. Les proportions des terrains et les espacements flex disposent d’un repli. Le helper Ziggy est compilé avec l’application.

Bootstrap 5.3 prend en charge iOS 12, mais un test sur l’iPad physique reste nécessaire pour confirmer le rendu et la fluidité. Les vérifications Chrome avec ancien user-agent et API récentes désactivées ne reproduisent pas le moteur Safari 12.
