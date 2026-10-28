<?php

use App\Actions\Auth\CreateMobileToken;
use App\Actions\Auth\RevokeCurrentToken;
use App\Actions\Auth\RevokeDeviceToken;
use App\Actions\Tasks\CompleteTask;
use App\Actions\Tasks\ReviewTaskCompletion;
use App\Actions\Tasks\SkipTaskOccurrence;
use App\Actions\Tasks\UndoSkippedOccurrence;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CompletionController;
use App\Http\Controllers\Api\V1\TaskController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::post('auth/login', CreateMobileToken::class)->middleware('throttle:10,1')->name('login');

    Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function () {
        Route::get('me', [AuthController::class, 'me'])->name('me');
        Route::post('auth/logout', RevokeCurrentToken::class)->name('logout');
        Route::get('auth/devices', [AuthController::class, 'devices'])->name('devices');
        Route::delete('auth/devices/{device}', RevokeDeviceToken::class)->whereNumber('device')->name('revoke-device');
        Route::get('tasks', [TaskController::class, 'index'])->name('tasks.index');
        Route::get('tasks/{task}', [TaskController::class, 'show'])->name('tasks.show');
        Route::post('tasks/{task}/complete', CompleteTask::class)->name('tasks.complete');
        Route::post('tasks/{task}/skip', SkipTaskOccurrence::class)->name('tasks.skip');
        Route::delete('tasks/{task}/skip', UndoSkippedOccurrence::class)->name('tasks.undo-skip');
        Route::get('completions/pending', [CompletionController::class, 'index'])->name('completions.pending');
        Route::post('completions/{completion}/review', ReviewTaskCompletion::class)->name('completions.review');
    });
});
