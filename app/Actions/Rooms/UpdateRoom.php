<?php

namespace App\Actions\Rooms;

use App\Models\Room;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Lorisleiva\Actions\Concerns\AsAction;

class UpdateRoom
{
    use AsAction;

    public function handle(Room $room, array $data): Room
    {
        $room->update($data);

        return $room;
    }

    public function asController(Request $request, Room $room): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'icon' => ['required', 'string', 'max:16'],
        ]);
        $this->handle($room, $data);

        return back();
    }
}
