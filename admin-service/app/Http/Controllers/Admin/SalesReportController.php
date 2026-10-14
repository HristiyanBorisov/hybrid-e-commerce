<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Reports\BuildSalesReportAction;
use App\Dto\Reports\SalesReportRowDto;
use App\Enums\ReportPeriod;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\SalesReportRequest;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Sales per day, week or month — on screen, as CSV or as PDF. */
final class SalesReportController extends Controller
{
    public function index(SalesReportRequest $request, BuildSalesReportAction $buildReport): View
    {
        return view('admin.reports.sales', [
            'report' => $buildReport->execute($request->toDto()),
            'periods' => ReportPeriod::cases(),
        ]);
    }

    public function csv(SalesReportRequest $request, BuildSalesReportAction $buildReport): StreamedResponse
    {
        $report = $buildReport->execute($request->toDto());

        return response()->streamDownload(function () use ($report): void {
            $output = fopen('php://output', 'w');

            fputcsv($output, SalesReportRowDto::CSV_COLUMNS, ',', '"', '');
            foreach ($report->rows as $row) {
                fputcsv($output, $row->toCsvRow(), ',', '"', '');
            }

            fclose($output);
        }, $report->fileName('csv'), ['Content-Type' => 'text/csv']);
    }

    public function pdf(SalesReportRequest $request, BuildSalesReportAction $buildReport): Response
    {
        $report = $buildReport->execute($request->toDto());

        return Pdf::loadView('admin.reports.sales-pdf', ['report' => $report])->download($report->fileName('pdf'));
    }
}
