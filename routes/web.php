<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GoalController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\PlanningController;
use App\Http\Controllers\RewardController;
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
    Route::get('rewards', [RewardController::class, 'index'])->name('rewards.index');
    Route::post('rewards', [RewardController::class, 'store'])->name('rewards.store');
    Route::patch('rewards/parents/{user}', [RewardController::class, 'updateParent'])->name('rewards.parents.update');
    Route::patch('rewards/{reward}', [RewardController::class, 'update'])->name('rewards.update');
    Route::get('goals', [GoalController::class, 'index'])->name('goals.index');
    Route::patch('goals/members/{member}', [GoalController::class, 'updateSettings'])->name('goals.settings');
    Route::patch('goals/accounts/{user}', [GoalController::class, 'linkAccount'])->name('goals.link-account');
    Route::post('goals/target', [GoalController::class, 'target'])->name('goals.target');
    Route::post('goals/completions/{completion}/review', [GoalController::class, 'reviewCompletion'])->name('goals.review-completion');
    Route::post('goals/reward-requests', [GoalController::class, 'requestReward'])->name('goals.request-reward');
    Route::post('goals/reward-requests/{rewardRequest}/review', [GoalController::class, 'reviewRequest'])->name('goals.review-request');

    Route::resource('rooms', RoomController::class)->except(['create', 'edit']);
    Route::resource('members', MemberController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::resource('tasks', TaskController::class)->only(['index', 'store', 'update', 'destroy']);

    Route::post('tasks/{task}/complete', [TaskController::class, 'complete'])->name('tasks.complete');
    Route::delete('tasks/{task}/complete', [TaskController::class, 'undo'])->name('tasks.undo');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
