<?php

use App\Actions\Accounts\DeleteAccount;
use App\Actions\Accounts\UpdatePassword;
use App\Actions\Accounts\UpdateProfile;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', 'settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', UpdateProfile::class)->name('profile.update');
    Route::delete('settings/profile', DeleteAccount::class)->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');
    Route::put('settings/password', UpdatePassword::class)->name('password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');
});
