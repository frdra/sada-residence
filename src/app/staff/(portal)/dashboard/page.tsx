"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TaskSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  needsReview: number;
  rejected: number;
}

interface StaffData {
  user: { id: string; fullName: string; role: string; staffProfile: any };
  properties: { id: string; name: string; slug: string }[];
  rooms: { id: string; room_number: string; floor: number; property_id: string }[];
}

export default function StaffDashboardPage() {
  const [staffData, setStaffData] = useState<StaffData | null>(null);
  const [taskSummary, setTaskSummary] = useState<TaskSummary>({
    total: 0, pending: 0, inProgress: 0, completed: 0, needsReview: 0, rejected: 0,
  });
  const [recentIssues, setRecentIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, tasksRes, issuesRes] = await Promise.all([
          fetch("/api/staff/profile"),
          fetch(`/api/staff/tasks?date=${today}`),
          fetch("/api/staff/issues"),
        ]);
        const profile = await profileRes.json();
        const tasks = await tasksRes.json();
        const issues = await issuesRes.json();

        setStaffData(profile);

        const taskList = tasks.tasks || [];
        setTaskSummary({
          total: taskList.length,
          pending: taskList.filter((t: any) => t.status === "pending").length,
          inProgress: taskList.filter((t: any) => t.status === "in_progress").length,
          completed: taskList.filter((t: any) =>
            ["completed", "needs_review", "approved"].includes(t.status)
          ).length,
          needsReview: taskList.filter((t: any) => t.status === "needs_review").length,
          rejected: taskList.filter((t: any) => t.status === "rejected").length,
        });

        setRecentIssues((issues.issues || []).slice(0, 3));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [today]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Greeting */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 text-white">
        <p className="text-blue-200 text-sm">Selamat datang,</p>
        <h2 className="text-xl font-bold">{staffData?.user?.fullName || "Staff"}</h2>
        <p className="text-blue-200 text-sm mt-1">
          {new Date().toLocaleDateString("id-ID", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{taskSummary.pending}</div>
          <div className="text-xs text-gray-500 mt-1">Tugas Menunggu</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-green-600">{taskSummary.completed}</div>
          <div className="text-xs text-gray-500 mt-1">Selesai Hari Ini</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-orange-500">{taskSummary.inProgress}</div>
          <div className="text-xs text-gray-500 mt-1">Sedang Dikerjakan</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-red-500">{taskSummary.rejected}</div>
          <div className="text-xs text-gray-500 mt-1">Perlu Ulang</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Aksi Cepat</h3>
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/staff/tasks"
            className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col items-center text-center hover:border-blue-300 transition-colors"
          >
            <span className="text-2xl mb-2">🧹</span>
            <span className="text-xs font-medium text-gray-700">Mulai Bersihkan</span>
          </Link>
          <Link
            href="/staff/issues"
            className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col items-center text-center hover:border-blue-300 transition-colors"
          >
            <span className="text-2xl mb-2">🔧</span>
            <span className="text-xs font-medium text-gray-700">Lapor Kerusakan</span>
          </Link>
          <Link
            href="/staff/laundry"
            className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col items-center text-center hover:border-blue-300 transition-colors"
          >
            <span className="text-2xl mb-2">👕</span>
            <span className="text-xs font-medium text-gray-700">Laundry</span>
          </Link>
        </div>
      </div>

      {/* Recent Issues */}
      {recentIssues.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Kerusakan Terbaru</h3>
          <div className="space-y-2">
            {recentIssues.map((issue: any) => (
              <div
                key={issue.id}
                className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{issue.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {issue.room?.room_number} • {issue.property?.name}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      issue.severity === "critical"
                        ? "bg-red-100 text-red-700"
                        : issue.severity === "high"
                        ? "bg-orange-100 text-orange-700"
                        : issue.severity === "medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {issue.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
