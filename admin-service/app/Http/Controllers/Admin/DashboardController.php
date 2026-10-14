<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Dashboard\BuildDashboardMetricsAction;
use App\Http\Controllers\Controller;
use Illuminate\View\View;

final class DashboardController extends Controller
{
    public function __invoke(BuildDashboardMetricsAction $buildMetrics): View
    {
        return view('admin.dashboard', [
            'metrics' => $buildMetrics->execute(),
            'lowStock' => BuildDashboardMetricsAction::LOW_STOCK,
        ]);
    }
}
