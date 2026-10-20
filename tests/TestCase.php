<?php

namespace Tests;

use App\Models\Family;
use App\Support\FamilyContext;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Schema;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        if (Schema::hasTable('families')) {
            app(FamilyContext::class)->setFallback(Family::query()->value('id'));
        }
    }
}
