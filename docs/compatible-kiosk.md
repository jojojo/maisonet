# Kiosque pour les anciens iPad

`/kiosk/compatible` est une interface HTML servie par Laravel, indépendante de React, Vite et Tailwind 4. Son CSS classique et son JavaScript ES5 ciblent notamment Safari et Chrome sur iOS 12.5.7. Le navigateur doit toujours accepter la connexion HTTPS au serveur.

Les principaux points d’entrée du site redirigent les navigateurs iOS antérieurs à 16.4 vers cette interface. La détection ne sert qu’à choisir l’affichage : authentification, droits parent, protection du kiosque et isolation des familles s’appliquent aussi aux accès directs.

La connexion `/compatible/login` réutilise l’action Login, ses protections contre les essais répétés et les sessions habituelles. Un parent active ensuite le kiosque. Les tâches, jauges, participants et points de base viennent des mêmes modèles que l’interface complète. Les formulaires ordinaires réutilisent les actions EnterKiosk, CompleteKioskTask et LeaveKiosk avec CSRF. Les réalisations restent en attente de validation, sans crédit immédiat de points. Quitter le kiosque exige le mot de passe du compte connecté.

Plusieurs chronomètres indépendants peuvent fonctionner sur cet appareil. Leurs timestamps et participants sont conservés dans localStorage par compte ; ils reprennent après rechargement ou suspension de la tablette. Ils ne sont pas partagés avec les autres appareils ni avec les chronomètres de l’interface moderne. Une réalisation confirmée ne supprime que son propre chrono. Les tâches supprimées, déclarées ou dont la dernière réalisation a changé sont retirées des chronos au rechargement. Si le stockage est indisponible, un avertissement indique que les chronos ne survivront pas au rechargement.

Le bouton Actualiser recharge les missions du serveur ; il n’y a pas de rafraîchissement automatique. Les chronos restent visibles même si les filtres excluent leur tâche. Sans JavaScript, connexion, activation, réalisation et sortie fonctionnent encore ; les filtres et chronomètres sont masqués.

Cette interface ne propose pas les mini-jeux, l’édition des tâches ou la validation des points par les parents. Ces fonctions restent dans l’interface complète sur un appareil récent. Aucune donnée n’est migrée ou copiée.

Vérifications : tests PHP de connexion, détection des anciens navigateurs, activation, validation des participants, double soumission, points en attente, mot de passe de sortie et isolation entre familles ; analyse du script en ES5 ; parcours navigateur des formulaires, de deux chronomètres simultanés, de la reprise après rechargement et du fonctionnement sans JavaScript. Ces contrôles ne remplacent pas un essai sur un iPad physique sous iOS 12.
