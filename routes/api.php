<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CompletionController;
use App\Http\Controllers\Api\V1\TaskController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1')->name('login');

    Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function () {
        Route::get('me', [AuthController::class, 'me'])->name('me');
        Route::post('auth/logout', [AuthController::class, 'logout'])->name('logout');
        Route::get('auth/devices', [AuthController::class, 'devices'])->name('devices');
        Route::delete('auth/devices/{device}', [AuthController::class, 'revoke'])->whereNumber('device')->name('revoke-device');
        Route::get('tasks', [TaskController::class, 'index'])->name('tasks.index');
        Route::get('tasks/{task}', [TaskController::class, 'show'])->name('tasks.show');
        Route::post('tasks/{task}/complete', [TaskController::class, 'complete'])->name('tasks.complete');
        Route::get('completions/pending', [CompletionController::class, 'index'])->name('completions.pending');
        Route::post('completions/{completion}/review', [CompletionController::class, 'review'])->name('completions.review');
    });
});
