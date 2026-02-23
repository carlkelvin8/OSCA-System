"use client";

import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/lib/api";
import { Users, CheckCircle, Package, AlertTriangle } from "lucide-react";
import type { DashboardSummary } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await reportsApi.dashboardSummary();
      return res.data;
    },
    refetchInterval: 30_000, // Refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1E3A5F]" />
      </div>
    );
  }

  const stats = [
    {
      label: "Total Students",
      value: summary?.students.total ?? 0,
      sub: `${summary?.students.face_enrolled ?? 0} face-enrolled (${summary?.students.enrollment_rate ?? 0}%)`,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      label: "Attendance Today",
      value: summary?.attendance.today ?? 0,
      sub: "Scans recorded today",
      icon: CheckCircle,
      color: "bg-green-500",
    },
    {
      label: "Equipment Available",
      value: summary?.equipment.available ?? 0,
      sub: `${summary?.equipment.borrowed ?? 0} currently borrowed`,
      icon: Package,
      color: "bg-indigo-500",
    },
    {
      label: "Overdue Returns",
      value: summary?.transactions.overdue ?? 0,
      sub: "Transactions past due",
      icon: AlertTriangle,
      color: summary?.transactions.overdue ? "bg-red-500" : "bg-gray-400",
    },
  ];

  const equipmentChartData = summary
    ? [
        { name: "Available", qty: summary.equipment.available, fill: "#22c55e" },
        { name: "Borrowed", qty: summary.equipment.borrowed, fill: "#6366f1" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          OSCA Attendance & Inventory Overview
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-sm p-6 flex items-start gap-4"
            >
              <div className={`${stat.color} p-3 rounded-xl text-white`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm font-medium text-gray-700">{stat.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Equipment chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Equipment Status
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={equipmentChartData} barCategoryGap="40%">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="qty" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-gray-400 text-right">
        Last updated:{" "}
        {summary
          ? new Date(summary.generated_at).toLocaleString("en-PH")
          : "—"}
      </p>
    </div>
  );
}
