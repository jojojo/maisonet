<?php

namespace App\Actions\Kiosk;

use App\Models\TaskCompletion;
use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Lottery;
use Lorisleiva\Actions\Concerns\AsAction;

class ProposeMiniGame
{
    use AsAction;

    public const GAMES = ['memory-match', 'whack-a-mole', 'tic-tac-toe', '2048', 'pong', 'breakout', 'dino-runner', 'flappy', 'fruit-ninja', 'stack'];

    public function handle(TaskCompletion $completion, Session $session): ?array
    {
        // A repeated declaration must never grant another draw or another game.
        if (! $completion->wasRecentlyCreated || $completion->status !== 'pending') {
            return null;
        }
        $now = now()->getTimestamp();
        $lastOffer = $session->get('kiosk_bonus.offered_at');
        if ($lastOffer !== null && $now - (int) $lastOffer < 600) {
            return null;
        }
        if (! Lottery::odds(1, 3)->choose()) {
            return null;
        }
        $choices = array_values(array_diff(self::GAMES, [$session->get('kiosk_bonus.last_game')]));
        $game = $choices[random_int(0, count($choices) - 1)];
        $session->put('kiosk_bonus', ['offered_at' => $now, 'last_game' => $game]);

        return ['game' => $game, 'completion_id' => $completion->id];
    }
}
