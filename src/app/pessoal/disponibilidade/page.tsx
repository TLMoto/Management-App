"use client";

import ProtectedPage from "@/src/components/ProtectedPage";
import Link from "next/link";
import { useState, useCallback, useRef, useEffect } from "react";

interface TimeSlot {
  day: number;
  hour: number;
  minute: number;
}

interface AvailabilityData {
  [personId: string]: TimeSlot[];
}

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const totalMinutes = 0 * 60 + i * 30;
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  return { hour, minute };
});

/**
 * The TLCrab class is the initial page of the application.
 *
 * @class TLCrab
 */
export default function TLCrab() {
  const [selectedPerson, setSelectedPerson] = useState<string>("");
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [availability, setAvailability] = useState<AvailabilityData>({});
  const [dragStart, setDragStart] = useState<{ day: number; hour: number; minute: number } | null>(
    null
  );

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const isMouseDown = useRef(false);
  const [isSelectingMode, setIsSelectingMode] = useState<boolean | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carregar dados do localStorage
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

  // Salvar dados no localStorage
  useEffect(() => {
    localStorage.setItem("tlcrab-availability", JSON.stringify(availability));
  }, [availability]);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsDropdownOpen(true);

    // Se o campo estiver vazio, limpar a seleção
    if (value.trim() === "") {
      setSelectedPerson("");
    }
  };

  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };

  const clearSelection = () => {
    setSelectedPerson("");
    setSearchTerm("");
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

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
      setIsSelectingMode(!currentlySelected); // true = add, false = remove
      isMouseDown.current = true;
      setDragStart({ day, hour, minute });

      toggleTimeSlot(day, hour, minute); // toggle first clicked slot
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
          // Add mode
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
          // Remove mode
          return {
            ...prev,
            [selectedPerson]: personSlots.filter(
              s =>
                !newSlots.some(
                  slot => slot.day === s.day && slot.hour === s.hour && slot.minute === s.minute
                )
            ),
          };
        }
      });
    },
    [selectedPerson, dragStart, isSelectingMode]
  );

  const getSlotCount = (day: number, hour: number, minute: number) => {
    return Object.values(availability).reduce((count, personSlots) => {
      return personSlots.some(
        slot => slot.day === day && slot.hour === hour && slot.minute === minute
      )
        ? count + 1
        : count;
    }, 0);
  };

  const getPersonStats = (personId: string) => {
    const slots = availability[personId] || [];
    return {
      totalHours: Math.round(slots.length * 0.5 * 10) / 10,
      weekPercentage: Math.round((slots.length / (7 * 48)) * 100),
    };
  };

  return (
    <ProtectedPage>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-500 mb-4">TLCrab - Gestão de Turnos</h1>

          <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Calendário de Edição</h2>
              <p className="text-sm text-gray-600">
                Selecione uma pessoa e clique/arraste para definir disponibilidade
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                      Hora
                    </th>
                    {DAYS.map((day, index) => (
                      <th
                        key={index}
                        className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody
                  className="bg-white divide-y divide-gray-200 select-none"
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {TIME_SLOTS.map((timeSlot, slotIndex) => (
                    <tr key={slotIndex}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white border-r">
                        {timeSlot.hour.toString().padStart(2, "0")}:
                        {timeSlot.minute.toString().padStart(2, "0")}
                      </td>
                      {DAYS.map((_, dayIndex) => {
                        const count = getSlotCount(dayIndex, timeSlot.hour, timeSlot.minute);

                        return (
                          <td key={dayIndex} className="px-1 py-1">
                            <div
                              className={`
                              h-8 w-full cursor-pointer border border-gray-200 transition-all duration-200 rounded
                              ${"ring-2 ring-blue-500 bg-blue-100"}
                              ${!selectedPerson ? "cursor-not-allowed opacity-50" : ""}
                              flex items-center justify-center relative group
                            `}
                              onMouseDown={() =>
                                handleMouseDown(dayIndex, timeSlot.hour, timeSlot.minute)
                              }
                              onMouseEnter={() =>
                                handleMouseEnter(dayIndex, timeSlot.hour, timeSlot.minute)
                              }
                              title={`${DAYS[dayIndex]} ${timeSlot.hour.toString().padStart(2, "0")}:${timeSlot.minute.toString().padStart(2, "0")} - ${count} pessoas`}
                            >
                              <span className="text-xs font-medium text-gray-700">
                                {count || ""}
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

          {selectedPerson && (
            <div className="mt-8 bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Disponibilidade de</h3>
              {(() => {
                const stats = getPersonStats(selectedPerson);
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    <div className="text-center">
                      <Link
                        href="/tlcrab/analise"
                        className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors inline-block"
                      >
                        Ver Análise Completa
                      </Link>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </main>
    </ProtectedPage>
  );
}
