# API mobile Maiso’net — v1

Première tranche : connexion avec un compte existant, lecture des tâches,
déclaration de réalisation et validation parentale. L’application web utilise
toujours Inertia. Les deux interfaces appellent les mêmes `CompletionService`
et `GoalService` ; elles partagent la validation des participants et des décisions.

Base : `https://maisonet.eoloa.net/api/v1` (ou l’URL locale du serveur Laravel).
Toutes les réponses, y compris les erreurs, sont en JSON, sans redirection vers
le formulaire de connexion. Envoyer `Content-Type: application/json` pour les corps JSON.

## Authentification

`POST /auth/login` :

```json
{
  "email": "compte@example.com",
  "password": "mot de passe",
  "device_name": "iPad cuisine"
}
```

Réponse `201` :

```json
{
  "token_type": "Bearer",
  "access_token": "jeton-retourne-une-seule-fois",
  "expires_at": "2026-11-19T12:00:00+00:00"
}
```

Les autres routes exigent `Authorization: Bearer <access_token>`. Sanctum stocke
uniquement le condensat du secret. Chaque connexion crée un jeton indépendant,
valable 30 jours ; son nom sert de libellé, pas d’identifiant unique. Après
expiration, il faut se reconnecter. Le client mobile devra conserver le secret
dans le stockage sécurisé du système et l’effacer après déconnexion ou `401`.
Ne pas le mettre dans une URL ni dans les journaux.

L’API accepte uniquement les jetons : les cookies du site ou du kiosque ne
donnent pas accès à ces routes. Le rôle parent est relu en base à chaque requête.
Un changement ou une réinitialisation de mot de passe révoque tous les jetons.
La connexion est limitée à 10 requêtes/minute/IP et 5 échecs/minute/adresse de compte.
Les routes authentifiées sont limitées à 120 requêtes/minute/compte.

| Méthode | Route | Résultat |
| --- | --- | --- |
| GET | `/me` | `data` : id, name, email, is_parent, member_id, family `{id,name}`, members `{id,name,color}`, rooms `{id,name,icon}` |
| GET | `/auth/devices` | `data` : appareils du compte, id, name, last_used_at, expires_at, created_at ; aucun secret |
| DELETE | `/auth/devices/{id}` | Révoque uniquement un appareil du compte ; `204` |
| POST | `/auth/logout` | Révoque le jeton courant uniquement ; `204` |

`/me` fournit les informations nécessaires aux sélecteurs de pièces et de
participants. Le code d’invitation et les autres comptes ne sont pas exposés.
Un compte enfant non relié à un membre peut consulter le foyer mais doit être
relié par un parent avant de déclarer une réalisation.

## Tâches

| Méthode | Route | Résultat |
| --- | --- | --- |
| GET | `/tasks` | Liste paginée des tâches du foyer |
| GET | `/tasks/{id}` | Une tâche dans `data` |
| POST | `/tasks/{id}/complete` | La réalisation dans `data`, avec ses participants et la tâche actualisée |

Filtres de liste facultatifs : `mine=1` (uniquement les tâches affectées au membre
du compte), `room_id`, `status=overdue|today|upcoming|done`, `per_page=1..100`
(30 par défaut), `page`. Sans `mine`, toutes les tâches du foyer sont visibles,
y compris celles sans attribution. Avec `mine`, un compte non relié obtient une
liste vide. Tri par échéance croissante puis identifiant, tâches terminées à la fin.

Les listes suivent le format Laravel Resource : `data`, `links`, `meta`.
`meta` contient notamment `current_page`, `last_page`, `per_page`, `total`.
Suivre `links.next` jusqu’à sa valeur `null`.

Une tâche contient : `id`, `title`, `notes`, `room`, `members`, `recurrence`,
`interval`, `next_due_date`, `last_completed_at`, `effort_size`, `effort_points`,
`status`, `dirt_level`, `can_earn_points`, `points_available_on`, `completion_info`.
Les dates métier utilisent `YYYY-MM-DD` dans le fuseau du serveur. `dirt_level`
vaut 0..100, ou `null` si non applicable. `completion_info` est `null` ou contient
id, status, completed_on, submitted_by de la dernière réalisation non refusée.

Corps de déclaration :

```json
{"member_ids": [3, 4]}
```

Sans `member_ids`, un enfant se déclare lui-même et un parent utilise les membres
affectés à la tâche. Un enfant doit participer à toute réalisation qu’il déclare.
Le parent peut préciser les participants effectifs. Le champ historique
`member_id` reste accepté ; si les deux champs sont fournis, `member_ids` prévaut.
Les champs de points, rôle, famille, date et statut envoyés par le client sont ignorés.

Une réalisation enfant est `pending`, une réalisation parent est `approved`.
La prochaine échéance est calculée par le serveur. La réalisation ne garantit
pas un nouveau gain : les règles de récurrence empêchent le cumul abusif.
Un double envoi le même jour renvoie la réalisation existante sans nouveau crédit.
Une tâche clôturée sans prochaine échéance répond `409`.

## Validation parentale

| Méthode | Route | Résultat |
| --- | --- | --- |
| GET | `/completions/pending` | Liste paginée des réalisations à valider, plus anciennes en premier ; mêmes paramètres de pagination |
| POST | `/completions/{id}/review` | Réalisation actualisée dans `data` |

Ces deux routes sont réservées aux parents. Pour valider :

```json
{"decision": "approve", "member_ids": [3, 4]}
```

Indiquer les participants effectifs ; ils sont obligatoires si des points doivent
être attribués. Pour refuser : `{"decision":"reject"}`. Le refus rouvre la tâche
si aucune réalisation plus récente ne la remplace. Une décision déjà traitée
n’est pas appliquée une seconde fois. Les points sont partagés entre participants
et les étoiles hebdomadaires sont calculées par les services existants.

Une réalisation contient `id`, `task_id`, `task`, `status`, `completed_on`,
`effort_points`, `awards_points`, `submitted_by`, `reviewed_by`, `reviewed_at`,
`participants` (id, name, color, points). `points` est la part prévue ; elle
n’est créditée qu’après approbation lorsque `awards_points` vaut `true`.

## Erreurs et isolation

| Code | Signification |
| --- | --- |
| 401 | Jeton absent, invalide, expiré ou révoqué |
| 403 | Action réservée aux parents |
| 404 | Ressource inexistante ou appartenant à un autre foyer/compte |
| 409 | Tâche déjà clôturée |
| 422 | Champs invalides ; détails dans `errors`, indexés par champ |
| 429 | Limite de requêtes ; respecter `Retry-After` |

Chaque requête déduit le foyer du compte authentifié. Aucun `family_id` fourni
par le client ne sélectionne de foyer. Les identifiants de pièces et participants
sont validés dans ce foyer, et la résolution des routes est cloisonnée.

## Installation et vérification

### Interface de prévisualisation

Ouvrir `/mobile` pour essayer le client React autonome. Un raccourci « Interface
mobile » est présent dans le menu du site. Le client utilise uniquement cette
API, sans navigation Inertia. Sa compilation est incluse dans `npm run build`.

Le compte habituel permet de se connecter. L’interface comprend les missions
du foyer ou du membre, un filtre par pièce, la pagination, le choix des
participants, la déclaration d’une réalisation, le coin parent et la déconnexion.
Elle dispose de son propre manifeste pour une ouverture sur `/mobile` depuis
l’écran d’accueil. Elle nécessite une connexion réseau ; aucun envoi hors ligne
n’est mis en attente.

Pour ce prototype navigateur, le jeton est conservé dans `sessionStorage`, propre
à l’onglet, avec repli en mémoire si ce stockage est indisponible. La déconnexion
révoque le jeton côté serveur avant de l’effacer localement ; une réponse `401`
efface la session. Le site complet conserve sa connexion web indépendante.
Les projets Capacitor utilisent désormais le coffre sécurisé du système et un
transport HTTP natif vers le serveur. La page `/mobile` reste la prévisualisation
navigateur. Voir [la compilation Android et iOS](native-app.md) pour les paquets natifs.

### Commandes

```sh
composer install
php artisan migrate
php artisan test --compact
node --experimental-strip-types --test tests/frontend/mobile-api.test.mjs
```

La migration ajoute uniquement `personal_access_tokens` aux bases déjà migrées.
Les jetons expirés peuvent être nettoyés avec `php artisan sanctum:prune-expired`.
La suite `MobileApiTest` utilise de vrais jetons Bearer pour vérifier le parcours,
les rôles, la révocation, l’expiration et l’isolation entre plusieurs familles.

Restent pour les prochaines tranches : inscription et invitation dans le client
mobile, écriture des tâches, objectifs/récompenses, kiosque, notifications
et synchronisation hors connexion. Les projets Capacitor sont
décrits dans [la documentation native](native-app.md) ; ils utilisent le transport
HTTP natif et ne demandent pas d’élargissement CORS côté serveur.
