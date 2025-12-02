"use client";

import ProtectedPage from "@/src/components/ProtectedPage";
import { useState, useCallback, useRef, useEffect } from "react";
import { getEvent, loginOrCreatePerson, updateAvailability } from "../../api/crab/api";
import { useUser } from "@/src/components/UserProvider";

interface TimeSlot {
  day: number;
  hour: number;
  minute: number;
}

interface AvailabilityData {
  [personId: string]: TimeSlot[];
}

// parametros do calendario
const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const totalMinutes = 0 * 60 + i * 30;
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  return { hour, minute };
});

// ID dos crabfits
const CRAB_EVENTS = {
  presencial: "tlmotopresencial-669665",
};

export default function TLCrab() {
  const [availability, setAvailability] = useState<AvailabilityData>({});
  const [dragStart, setDragStart] = useState<{ day: number; hour: number; minute: number } | null>(
    null
  );
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isMouseDown = useRef(false);
  const [isSelectingMode, setIsSelectingMode] = useState<boolean | null>(null);

  const { user } = useUser();
  const selectedPerson = user ? `user-${user.istId}` : "";

  // Auto login when component mounts and user exists
  useEffect(() => {
    // Convert CrabFit availability format to local TimeSlot format
    const loadAvailabilityFromCrabFit = (crabAvailability: string[]) => {
      const timeSlots: TimeSlot[] = [];

      crabAvailability.forEach(slot => {
        // Format: "HHMM-D" (e.g., "0800-1" for Monday 08:00)
        const match = slot.match(/^(\d{2})(\d{2})-(\d+)$/);
        if (match) {
          const hour = parseInt(match[1]);
          const minute = parseInt(match[2]);
          const day = parseInt(match[3]);
          timeSlots.push({ day, hour, minute });
        }
      });

      if (timeSlots.length > 0 && selectedPerson) {
        setAvailability(prev => ({
          ...prev,
          [selectedPerson]: timeSlots,
        }));
      }
    };

    // Auto login function
    const autoLoginUser = async () => {
      if (!user) return;

      setIsLoading(true);

      try {
        const result = await loginOrCreatePerson(CRAB_EVENTS.presencial, user.istId.toString());
        setIsLoggedIn(true);

        // Load existing availability from CrabFit
        if (result.availability && result.availability.length > 0) {
          loadAvailabilityFromCrabFit(result.availability);
        }

        console.log("Login automático OK:", result);
      } catch (error) {
        console.error("Erro no login automático:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user && !isLoggedIn) {
      autoLoginUser();
    }
  }, [isLoggedIn, selectedPerson, user]);

  // Sync availability to CrabFit
  const syncAvailability = async () => {
    if (!user || !isLoggedIn || !selectedPerson) return;

    const personSlots = availability[selectedPerson] || [];

    // Convert local slots to CrabFit format
    const crabAvailability = personSlots.map(slot => {
      const hourStr = slot.hour.toString().padStart(2, "0");
      const minuteStr = slot.minute.toString().padStart(2, "0");
      return `${hourStr}${minuteStr}-${slot.day}`;
    });

    try {
      await updateAvailability(CRAB_EVENTS.presencial, user.istId.toString(), crabAvailability);
      console.log("Disponibilidade sincronizada automaticamente");
    } catch (error) {
      console.error("Erro na sincronização automática:", error);
    }
  };

  // Manual sync function
  const manualSync = async () => {
    if (!user || !isLoggedIn || !selectedPerson) return;

    const personSlots = availability[selectedPerson] || [];
    if (personSlots.length === 0) return;

    try {
      await syncAvailability();
      console.log("Sincronização manual OK");
    } catch (error) {
      console.error("Erro na sincronização:", error);
    }
  };

  // Load data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("tlcrab-availability");
    if (saved) {
      try {
        setAvailability(JSON.parse(saved));
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      }
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem("tlcrab-availability", JSON.stringify(availability));
  }, [availability]);

  const toggleTimeSlot = useCallback(
    (day: number, hour: number, minute: number) => {
      if (!selectedPerson) return;

      setAvailability(prev => {
        const personSlots = prev[selectedPerson] || [];
        const existingIndex = personSlots.findIndex(
          slot => slot.day === day && slot.hour === hour && slot.minute === minute
        );

        if (existingIndex !== -1) {
          return {
            ...prev,
            [selectedPerson]: personSlots.filter(
              slot => !(slot.day === day && slot.hour === hour && slot.minute === minute)
            ),
          };
        } else {
          return {
            ...prev,
            [selectedPerson]: [...personSlots, { day, hour, minute }],
          };
        }
      });
    },
    [selectedPerson]
  );

  const isSlotSelected = useCallback(
    (day: number, hour: number, minute: number) => {
      if (!selectedPerson) return false;
      const personSlots = availability[selectedPerson] || [];
      return personSlots.some(
        slot => slot.day === day && slot.hour === hour && slot.minute === minute
      );
    },
    [availability, selectedPerson]
  );

  const handleMouseDown = useCallback(
    (day: number, hour: number, minute: number) => {
      if (!selectedPerson) return;

      const currentlySelected = isSlotSelected(day, hour, minute);
      setIsSelectingMode(!currentlySelected);
      isMouseDown.current = true;
      setDragStart({ day, hour, minute });

      toggleTimeSlot(day, hour, minute);
    },
    [isSlotSelected, selectedPerson, toggleTimeSlot]
  );

  const handleMouseUp = useCallback(() => {
    isMouseDown.current = false;
    setDragStart(null);
    setIsSelectingMode(null);
  }, []);

  const handleMouseEnter = useCallback(
    (day: number, hour: number, minute: number) => {
      if (!isMouseDown.current || !selectedPerson || !dragStart || isSelectingMode === null) return;

      const startDay = Math.min(dragStart.day, day);
      const endDay = Math.max(dragStart.day, day);
      const startSlotIndex = TIME_SLOTS.findIndex(
        slot => slot.hour === dragStart.hour && slot.minute === dragStart.minute
      );
      const endSlotIndex = TIME_SLOTS.findIndex(
        slot => slot.hour === hour && slot.minute === minute
      );
      const startSlot = Math.min(startSlotIndex, endSlotIndex);
      const endSlot = Math.max(startSlotIndex, endSlotIndex);

      const newSlots: TimeSlot[] = [];
      for (let d = startDay; d <= endDay; d++) {
        for (let s = startSlot; s <= endSlot; s++) {
          newSlots.push({ day: d, hour: TIME_SLOTS[s].hour, minute: TIME_SLOTS[s].minute });
        }
      }

      setAvailability(prev => {
        const personSlots = prev[selectedPerson] || [];
        if (isSelectingMode) {
          const merged = [...personSlots];
          for (const slot of newSlots) {
            if (
              !merged.some(
                s => s.day === slot.day && s.hour === slot.hour && s.minute === slot.minute
              )
            ) {
              merged.push(slot);
            }
          }
          return { ...prev, [selectedPerson]: merged };
        } else {
          return {
            ...prev,
            [selectedPerson]: personSlots.filter(
              s =>
                !newSlots.some(
                  slot => slot.day === s.day && slot.hour === s.hour && s.minute === slot.minute
                )
            ),
          };
        }
      });
    },
    [selectedPerson, dragStart, isSelectingMode]
  );

  const getPersonStats = (personId: string) => {
    const slots = availability[personId] || [];
    return {
      totalHours: Math.round(slots.length * 0.5 * 10) / 10,
      weekPercentage: Math.round((slots.length / (7 * 48)) * 100),
    };
  };

  if (!user) {
    return (
      <ProtectedPage>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h1>
            <p>Você precisa fazer login para acessar esta página.</p>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-blue-500 mb-8 mt-8 relative z-30">
          Minha Disponibilidade
        </h1>

        {/* Calendário */}
        <div className="bg-white rounded-lg shadow mb-8 overflow-x-auto">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Disponibilidade</h2>

            {isLoggedIn && (
              <button
                onClick={manualSync}
                disabled={!selectedPerson}
                className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded font-medium transition-colors"
              >
                Guardar
              </button>
            )}
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

              <tbody
                className={`bg-white divide-y divide-gray-200 select-none ${
                  !isLoggedIn ? "opacity-50 pointer-events-none" : ""
                }`}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
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
                      const isSelected = isSlotSelected(dayIndex, timeSlot.hour, timeSlot.minute);

                      return (
                        <td key={dayIndex} className="w-20 sm:w-24 md:w-28 px-1 py-1">
                          <div
                            className={`
                              h-8 sm:h-10 w-full cursor-pointer border border-gray-200 transition-all duration-200 rounded
                              ${isSelected ? "ring-1 sm:ring-2 ring-blue-500 bg-blue-100" : "bg-gray-50 hover:bg-gray-100"}
                              ${!selectedPerson || !isLoggedIn ? "cursor-not-allowed opacity-50" : ""}
                              flex items-center justify-center relative group touch-manipulation
                            `}
                            onMouseDown={() =>
                              isLoggedIn &&
                              handleMouseDown(dayIndex, timeSlot.hour, timeSlot.minute)
                            }
                            onMouseEnter={() =>
                              isLoggedIn &&
                              handleMouseEnter(dayIndex, timeSlot.hour, timeSlot.minute)
                            }
                            onTouchStart={() => {
                              if (isLoggedIn) {
                                handleMouseDown(dayIndex, timeSlot.hour, timeSlot.minute);
                              }
                            }}
                            onTouchEnd={handleMouseUp}
                            style={{ touchAction: "none" }}
                          >
                            <span className="text-xs font-medium text-gray-700">
                              {isSelected ? "✓" : ""}
                            </span>
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

        {/* Estatísticas */}
        {selectedPerson && user && isLoggedIn && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Estatísticas de {user.nome}</h3>

            {(() => {
              const stats = getPersonStats(selectedPerson);
              return (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.totalHours}h</p>
                    <p className="text-sm text-gray-600">Horas Totais</p>
                  </div>

                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.weekPercentage}%</p>
                    <p className="text-sm text-gray-600">Da Semana</p>
                  </div>

                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {(availability[selectedPerson] || []).length}
                    </p>
                    <p className="text-sm text-gray-600">Slots Totais</p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </ProtectedPage>
  );
}
