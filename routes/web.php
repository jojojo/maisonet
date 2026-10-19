<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\PlanningController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TaskTemplateController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('planning', PlanningController::class)->name('planning');
    Route::get('task-templates', [TaskTemplateController::class, 'index'])->name('task-templates.index');
    Route::post('task-templates/import', [TaskTemplateController::class, 'store'])->name('task-templates.store');

    Route::resource('rooms', RoomController::class)->except(['create', 'edit']);
    Route::resource('members', MemberController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::resource('tasks', TaskController::class)->only(['index', 'store', 'update', 'destroy']);

    Route::post('tasks/{task}/complete', [TaskController::class, 'complete'])->name('tasks.complete');
    Route::delete('tasks/{task}/complete', [TaskController::class, 'undo'])->name('tasks.undo');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
