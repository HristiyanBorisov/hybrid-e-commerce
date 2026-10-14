<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ __('Sales report') }}</title>
    {{-- dompdf understands plain CSS only. Helvetica is built into PDF readers, so no font has to be embedded. --}}
    <style>
        body { font-family: Helvetica, sans-serif; font-size: 11px; color: #1f2933; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .meta { color: #6b7280; margin-bottom: 16px; }
        table.report { width: 100%; border-collapse: collapse; }
        table.report th, table.report td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; }
        table.report th { background: #f3f4f6; }
        table.report .number { text-align: right; }
        table.report tr.empty td { color: #9ca3af; }
        table.report tr.total td { font-weight: bold; background: #f3f4f6; }
    </style>
</head>
<body>
    <h1>{{ __('Sales report') }} — {{ $report->period->label() }}</h1>
    <div class="meta">
        {{ $report->from->toDateString() }} – {{ $report->to->toDateString() }} ·
        {{ __('Paid, shipped and delivered orders, by the day they were placed (UTC).') }} ·
        {{ __('Created :time UTC', ['time' => now()->format('Y-m-d H:i')]) }}
    </div>

    @include('admin.reports.partials.table', ['report' => $report])
</body>
</html>
