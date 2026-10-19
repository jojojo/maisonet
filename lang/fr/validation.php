<?php

return [
    'required' => 'Le champ :attribute est obligatoire.',
    'string' => 'Le champ :attribute doit être du texte.',
    'integer' => 'Le champ :attribute doit être un nombre entier.',
    'date' => 'Le champ :attribute doit être une date valide.',
    'exists' => 'La valeur choisie pour :attribute est invalide.',
    'in' => 'La valeur choisie pour :attribute est invalide.',
    'enum' => 'La valeur choisie pour :attribute est invalide.',
    'regex' => 'Le format du champ :attribute est invalide.',
    'email' => 'Le champ :attribute doit être une adresse e-mail valide.',
    'confirmed' => 'La confirmation du champ :attribute ne correspond pas.',
    'unique' => 'La valeur de :attribute est déjà utilisée.',
    'max' => [
        'string' => 'Le champ :attribute ne doit pas dépasser :max caractères.',
        'numeric' => 'Le champ :attribute ne doit pas dépasser :max.',
    ],
    'min' => [
        'string' => 'Le champ :attribute doit contenir au moins :min caractères.',
        'numeric' => 'Le champ :attribute doit être au moins :min.',
    ],
    'attributes' => [
        'title' => 'titre',
        'notes' => 'notes',
        'room_id' => 'pièce',
        'member_id' => 'membre',
        'recurrence' => 'récurrence',
        'interval' => 'intervalle',
        'next_due_date' => 'échéance',
        'name' => 'nom',
        'icon' => 'icône',
        'color' => 'couleur',
        'email' => 'e-mail',
        'password' => 'mot de passe',
    ],
];
