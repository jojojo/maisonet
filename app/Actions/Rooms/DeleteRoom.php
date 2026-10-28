<?php

namespace App\Actions\Rooms;

use App\Models\Room;
use Illuminate\Http\RedirectResponse;
use Lorisleiva\Actions\Concerns\AsAction;

class DeleteRoom
{
    use AsAction;

    public function handle(Room $room): void
    {
        $room->delete();
    }

    public function asController(Room $room): RedirectResponse
    {
        $this->handle($room);

        return to_route('rooms.index');
    }
}
