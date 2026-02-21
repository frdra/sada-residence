"use client";

import { useState } from "react";

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  return (
    <div>
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
            className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
          >
            &larr;
          </button>
          <h3 className="font-semibold text-lg">
            {monthNames[month]} {year}
          </h3>
          <button
            onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
            className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
          >
            &rarr;
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">
              {d}
            </div>
          ))}
          {days.map((day, i) => {
            const isToday =
              day === new Date().getDate() &&
              month === new Date().getMonth() &&
              year === new Date().getFullYear();

            return (
              <div
                key={i}
                className={`text-center py-3 text-sm rounded-lg ${
                  !day
                    ? ""
                    : isToday
                    ? "bg-navy-900 text-white font-bold"
                    : "hover:bg-gray-50 cursor-pointer"
                }`}
              >
                {day || ""}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 mt-6 text-center">
          Kalender interaktif dengan data booking akan ditampilkan setelah integrasi database selesai.
          Klik pada tanggal untuk melihat detail booking hari tersebut.
        </p>
      </div>
    </div>
  );
}
