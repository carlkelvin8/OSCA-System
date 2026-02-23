"use client";

import { reportsApi } from "@/lib/api";
import { FileText, FileSpreadsheet, Download } from "lucide-react";

interface ReportCard {
  title: string;
  description: string;
  actions: { label: string; icon: typeof FileText; onClick: () => void }[];
}

export default function ReportsPage() {
  const downloadBlob = (data: Blob, filename: string) => {
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reports: ReportCard[] = [
    {
      title: "Attendance Report",
      description:
        "Complete attendance records with time-in/out, duration, and confidence scores.",
      actions: [
        {
          label: "Download PDF",
          icon: FileText,
          onClick: async () => {
            const res = await reportsApi.attendancePdf();
            downloadBlob(new Blob([res.data], { type: "application/pdf" }), "attendance_report.pdf");
          },
        },
        {
          label: "Download Excel",
          icon: FileSpreadsheet,
          onClick: async () => {
            const res = await reportsApi.attendanceXlsx();
            downloadBlob(
              new Blob([res.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              }),
              "attendance_report.xlsx"
            );
          },
        },
      ],
    },
    {
      title: "Inventory Report",
      description:
        "Full equipment list with quantities, conditions, barcodes, and borrowing status.",
      actions: [
        {
          label: "Download PDF",
          icon: FileText,
          onClick: async () => {
            const res = await reportsApi.inventoryPdf();
            downloadBlob(new Blob([res.data], { type: "application/pdf" }), "inventory_report.pdf");
          },
        },
        {
          label: "Download Excel",
          icon: FileSpreadsheet,
          onClick: async () => {
            const res = await reportsApi.inventoryXlsx();
            downloadBlob(
              new Blob([res.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              }),
              "inventory_report.xlsx"
            );
          },
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">Generate and export OSCA reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <div
            key={report.title}
            className="bg-white rounded-xl shadow-sm p-6 space-y-4"
          >
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{report.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{report.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {report.actions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={action.onClick}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#16304f] transition"
                  >
                    <Icon size={16} />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
