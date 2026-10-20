<?php

namespace App\Providers;

use App\Models\User;
use App\Support\FamilyContext;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->scoped(FamilyContext::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::define('manage-rewards', fn (User $user): bool => (bool) $user->is_parent);
        Gate::define('manage-goals', fn (User $user): bool => (bool) $user->is_parent);
    }
}
