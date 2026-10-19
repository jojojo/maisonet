<?php

return [
    'categories' => [
        ['key' => 'choices', 'name' => 'Les petits choix', 'icon' => '🎯'],
        ['key' => 'together', 'name' => 'Du temps ensemble', 'icon' => '💛'],
        ['key' => 'creative', 'name' => 'Créer et jouer', 'icon' => '🎨'],
        ['key' => 'outings', 'name' => 'Petites aventures', 'icon' => '🌿'],
        ['key' => 'special', 'name' => 'Les grands moments', 'icon' => '✨'],
    ],
    // key, category, title, description, icon, suggested star cost, audience.
    'rewards' => [
        ['choose-film', 'choices', 'Choisir le film familial', 'Proposer le film de la prochaine séance à la maison, parmi les choix convenus ensemble.', '🎬', 1, 'individual'],
        ['choose-menu', 'choices', 'Composer un menu', 'Choisir un repas et participer à sa préparation avec un parent.', '🍽️', 1, 'individual'],
        ['choose-music', 'choices', 'Préparer la playlist familiale', 'Choisir la musique pour un trajet ou un moment partagé à la maison.', '🎵', 1, 'individual'],
        ['choose-story', 'choices', 'Une histoire à deux voix', 'Choisir un livre à découvrir et le lire à tour de rôle avec un parent.', '📖', 1, 'individual'],
        ['choose-game', 'choices', 'Choisir le jeu du soir', 'Préparer le jeu de société qui réunira la famille.', '🎲', 1, 'individual'],

        ['board-games', 'together', 'Une soirée jeux', 'Réserver un moment pour sortir les jeux préférés et jouer tous ensemble.', '🃏', 2, 'family'],
        ['baking', 'together', 'Un atelier pâtisserie', 'Choisir une recette et préparer ensemble un goûter fait maison.', '🧁', 2, 'family'],
        ['parent-time', 'together', 'Un moment rien qu’à deux', 'Choisir une activité à partager avec un parent et fixer le moment ensemble.', '💛', 2, 'individual'],
        ['breakfast', 'together', 'Un petit-déjeuner spécial', 'Préparer une jolie table et imaginer ensemble un petit-déjeuner qui change.', '🥞', 2, 'family'],
        ['family-cinema', 'together', 'Le cinéma à la maison', 'Installer les coussins, fabriquer les billets et organiser une séance familiale.', '🍿', 3, 'family'],
        ['pyjama-party', 'together', 'Une soirée pyjama en famille', 'Préparer un programme de jeux et d’histoires pour une soirée douillette.', '🌙', 3, 'family'],

        ['painting', 'creative', 'Un atelier peinture', 'Choisir un thème et créer une œuvre à afficher à la maison.', '🎨', 2, 'individual'],
        ['building', 'creative', 'Un défi construction', 'Imaginer ensemble une grande construction avec les jeux disponibles.', '🧱', 2, 'individual'],
        ['indoor-den', 'creative', 'Construire une cabane', 'Transformer un coin de la maison en cabane avec des couvertures et des coussins.', '⛺', 2, 'family'],
        ['treasure-hunt', 'creative', 'Une chasse au trésor', 'Un parent prépare quelques indices pour une aventure dans la maison ou le jardin.', '🗺️', 3, 'family'],
        ['photo-challenge', 'creative', 'Un défi photo', 'Partir en balade et photographier des détails autour d’un thème choisi ensemble.', '📸', 2, 'individual'],
        ['make-comic', 'creative', 'Créer notre bande dessinée', 'Inventer une histoire et dessiner ses personnages à plusieurs mains.', '✏️', 2, 'family'],

        ['park', 'outings', 'Une sortie au parc', 'Choisir un parc et convenir ensemble du jour de la sortie.', '🛝', 2, 'individual'],
        ['library', 'outings', 'Une exploration à la bibliothèque', 'Prendre le temps de découvrir de nouveaux livres et de choisir ses lectures.', '📚', 2, 'individual'],
        ['picnic', 'outings', 'Un pique-nique', 'Préparer le panier ensemble et choisir un joli endroit pour déjeuner.', '🧺', 3, 'family'],
        ['bike-ride', 'outings', 'Une balade à vélo', 'Choisir avec un parent un parcours adapté pour une sortie ensemble.', '🚲', 3, 'family'],
        ['nature', 'outings', 'Une aventure dans la nature', 'Organiser une promenade avec une petite mission d’observation.', '🌳', 3, 'family'],
        ['swimming', 'outings', 'Une sortie à la piscine', 'Choisir une séance en famille et l’organiser avec les parents.', '🏊', 4, 'individual'],

        ['cinema', 'special', 'Une sortie au cinéma', 'Choisir un film adapté et convenir de la séance avec les parents.', '🎟️', 5, 'individual'],
        ['bowling', 'special', 'Une partie de bowling', 'Organiser une sortie pour essayer de faire tomber toutes les quilles.', '🎳', 5, 'family'],
        ['garden-camping', 'special', 'Camper dans le jardin', 'Préparer une petite aventure tout près de la maison, selon la météo.', '🏕️', 4, 'family'],
        ['family-day', 'special', 'Imaginer une journée en famille', 'Proposer un programme d’activités et le préparer avec les parents.', '☀️', 6, 'family'],
        ['memory-album', 'special', 'Créer notre album de souvenirs', 'Choisir les photos, raconter les bons moments et composer un petit album ensemble.', '📔', 3, 'family'],
    ],
];
