<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FamilyController;
use App\Http\Controllers\GoalController;
use App\Http\Controllers\KioskController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\PlanningController;
use App\Http\Controllers\RewardController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TaskTemplateController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard')->name('home');
Route::view('mobile', 'mobile')->name('mobile');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('family', [FamilyController::class, 'index'])->name('family.index');
    Route::patch('family', [FamilyController::class, 'update'])->name('family.update');
    Route::post('family/code', [FamilyController::class, 'renewCode'])->middleware('throttle:6,1')->name('family.renew-code');
    Route::get('kiosk', [KioskController::class, 'index'])->name('kiosk.index');
    Route::post('kiosk/enter', [KioskController::class, 'enter'])->name('kiosk.enter');
    Route::post('kiosk/leave', [KioskController::class, 'leave'])->middleware('throttle:6,1')->name('kiosk.leave');
    Route::post('kiosk/tasks/{task}/complete', [KioskController::class, 'complete'])->name('kiosk.complete');
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
