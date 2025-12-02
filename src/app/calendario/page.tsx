"use client";

import ProtectedPage from "@/src/components/ProtectedPage";

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const totalMinutes = i * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return { hour, minute };
});

export default function StaticWeeklyTable() {
  return (
    <ProtectedPage>
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-blue-500 mb-8 mt-8 relative z-30">Calendário</h1>

        {/* Calendário */}
        <div className="bg-white rounded-lg shadow mb-8 overflow-x-auto">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Calendário</h2>
          </div>

          <div className="relative">
            <table className="min-w-full table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 z-10 bg-gray-50 border-r border-gray-200">
                    Hora
                  </th>

                  {DAYS.map((day, index) => (
                    <th
                      key={index}
                      className="w-20 sm:w-24 md:w-28 px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <div className="block sm:hidden">{day.substring(0, 3)}</div>
                      <div className="hidden sm:block">{day}</div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className={`bg-white divide-y divide-gray-200 select-none `}>
                {TIME_SLOTS.map((timeSlot, slotIndex) => (
                  <tr key={slotIndex}>
                    <td className="px-4 z-9  whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white border-r">
                      {/** Show start time - end time (end = next TIME_SLOTS index, wrapped) */}
                      {timeSlot.hour.toString().padStart(2, "0")}:
                      {timeSlot.minute.toString().padStart(2, "0")}-
                      {(() => {
                        // Determine next slot (30 minutes later). Use next index if available, otherwise compute wrap-around.
                        const nextIndex = slotIndex + 1;
                        let endHour: number;
                        let endMinute: number;
                        if (nextIndex < TIME_SLOTS.length) {
                          endHour = TIME_SLOTS[nextIndex].hour;
                          endMinute = TIME_SLOTS[nextIndex].minute;
                        } else {
                          // wrap to next day
                          const totalMinutes = timeSlot.hour * 60 + timeSlot.minute + 30;
                          endHour = Math.floor(totalMinutes / 60) % 24;
                          endMinute = totalMinutes % 60;
                        }
                        return (
                          <>
                            {endHour.toString().padStart(2, "0")}:
                            {endMinute.toString().padStart(2, "0")}
                          </>
                        );
                      })()}
                    </td>

                    {DAYS.map((_, dayIndex) => {
                      return (
                        <td key={dayIndex} className="w-20 sm:w-24 md:w-28 px-1 py-1">
                          <div
                            className={`
                                  h-8 sm:h-10 w-full cursor-pointer border border-gray-200 transition-all duration-200 rounded
                                  bg-gray-50 hover:bg-gray-100
                                  flex items-center justify-center relative group touch-manipulation
                                `}
                            style={{ touchAction: "none" }}
                          >
                            <span className="text-xs font-medium text-gray-700"></span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </ProtectedPage>
  );
}
