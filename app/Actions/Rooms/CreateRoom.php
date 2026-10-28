<?php

namespace App\Actions\Rooms;

use App\Models\Room;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Lorisleiva\Actions\Concerns\AsAction;

class CreateRoom
{
    use AsAction;

    public function handle(array $data): Room
    {
        return Room::create($data);
    }

    public function asController(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'icon' => ['required', 'string', 'max:16'],
        ]);
        $this->handle($data);

        return back();
    }
}
