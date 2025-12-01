"use client";

import ProtectedPage from "@/src/components/ProtectedPage";
import Link from "next/link";
import { useState, useCallback, useRef, useEffect } from "react";
import { UserService } from "../../../api/airtable";

interface TimeSlot {
  day: number;
  hour: number;
  minute: number;
}

interface Person {
  id: string;
  name: string;
  area: string;
}

interface AvailabilityData {
  [personId: string]: TimeSlot[];
}

// Users will be loaded from Airtable
// const PEOPLE removed — data fetched via UserService.getAllUsers()

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
  const [users, setUsers] = useState<Person[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<Person[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  const isMouseDown = useRef(false);
  const [isSelectingMode, setIsSelectingMode] = useState<boolean | null>(null);
  const visitedSlotsRef = useRef<string[]>([]); // order of slots changed during current drag
  const originalStateRef = useRef<Map<string, boolean>>(new Map());
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

  // Filtrar pessoas baseado no termo de pesquisa (case-insensitive + diacritic-insensitive)
  useEffect(() => {
    // Normalizes and removes diacritics, then lowercases for comparison
    const normalize = (s: string) =>
      s
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLocaleLowerCase();

    const q = normalize(searchTerm.trim());
    let filtered = users;

    // If there is a search term, match against name OR area (diacritic- & case-insensitive)
    if (q !== "") {
      filtered = filtered.filter(person => {
        const name = normalize(person.name || "");
        const area = normalize(person.area || "");
        return name.includes(q) || area.includes(q);
      });
    }

    // Filter by area (diacritic- & case-insensitive exact match)
    if (selectedArea !== "") {
      const areaFilter = normalize(selectedArea);
      filtered = filtered.filter(person => normalize(person.area || "") === areaFilter);
    }

    setFilteredPeople(filtered);
  }, [searchTerm, selectedArea, users]);

  // Load users from Airtable
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const all = await UserService.getAllUsers();
        if (!mounted) return;
        // map Airtable User -> Person shape used in this page
        const mapped: Person[] = all.map(u => ({ id: u.id, name: u.nome, area: u.department }));
        setUsers(mapped);
        setFilteredPeople(mapped);
      } catch (err) {
        console.error("Failed to load users:", err);
      }
    })();
    return () => { mounted = false; };
  }, []);

    // Load departments from Airtable
    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          const deps = await UserService.getAllDepartments();
          if (mounted) setDepartments(deps);
        } catch (err) {
          console.error("Failed to load departments:", err);
        }
      })();
      return () => {
        mounted = false;
      };
    }, []);

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

  const handlePersonSelect = (person: Person) => {
    setSelectedPerson(person.id);
    setSearchTerm(`${person.name} (${person.area})`);
    setIsDropdownOpen(false);
  };

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
      const selecting = !currentlySelected; // true = add, false = remove
      setIsSelectingMode(selecting);
      isMouseDown.current = true;
      setDragStart({ day, hour, minute });

      // initialize visited/originals for this drag
      visitedSlotsRef.current = [];
      originalStateRef.current = new Map();

      const key = `${day}-${hour}-${minute}`;
      originalStateRef.current.set(key, currentlySelected);
      visitedSlotsRef.current.push(key);

      // Apply the intended state (set or unset) instead of toggling blindly
      setAvailability(prev => {
        const personSlots = prev[selectedPerson] || [];
        const exists = personSlots.some(s => s.day === day && s.hour === hour && s.minute === minute);
        if (selecting) {
          if (exists) return prev;
          return { ...prev, [selectedPerson]: [...personSlots, { day, hour, minute }] };
        } else {
          if (!exists) return prev;
          return {
            ...prev,
            [selectedPerson]: personSlots.filter(s => !(s.day === day && s.hour === hour && s.minute === minute)),
          };
        }
      });
    },
    [isSlotSelected, selectedPerson, toggleTimeSlot]
  );

  const handleMouseUp = useCallback(() => {
    isMouseDown.current = false;
    setDragStart(null);
    setIsSelectingMode(null);
    // clear visited/originals
    visitedSlotsRef.current = [];
    originalStateRef.current.clear();
  }, []);

  const handleMouseEnter = useCallback(
    (day: number, hour: number, minute: number) => {
      if (!isMouseDown.current || !selectedPerson || isSelectingMode === null) return;

      const key = `${day}-${hour}-${minute}`;
      const visited = visitedSlotsRef.current;
      const originals = originalStateRef.current;

      const idx = visited.indexOf(key);

      if (idx === -1) {
        // New forward slot: record original state and apply selecting action
        const currentlySelected = isSlotSelected(day, hour, minute);
        originals.set(key, currentlySelected);
        visited.push(key);

        setAvailability(prev => {
          const personSlots = prev[selectedPerson] || [];
          const exists = personSlots.some(s => s.day === day && s.hour === hour && s.minute === minute);
          if (isSelectingMode) {
            if (exists) return prev;
            return { ...prev, [selectedPerson]: [...personSlots, { day, hour, minute }] };
          } else {
            if (!exists) return prev;
            return {
              ...prev,
              [selectedPerson]: personSlots.filter(s => !(s.day === day && s.hour === hour && s.minute === minute)),
            };
          }
        });
      } else {
        // Already visited. If user moved back (i.e., key is earlier in stack), revert later visited slots until key is the last
        while (visited.length > 0 && visited[visited.length - 1] !== key) {
          const lastKey = visited.pop() as string;
          const [ld, lh, lm] = lastKey.split("-").map(n => parseInt(n, 10));
          const original = originals.get(lastKey) ?? false;
          // revert lastKey to original
          setAvailability(prev => {
            const personSlots = prev[selectedPerson] || [];
            const exists = personSlots.some(s => s.day === ld && s.hour === lh && s.minute === lm);
            if (original) {
              // should be selected
              if (exists) return prev;
              return { ...prev, [selectedPerson]: [...personSlots, { day: ld, hour: lh, minute: lm }] };
            } else {
              // should be not selected
              if (!exists) return prev;
              return {
                ...prev,
                [selectedPerson]: personSlots.filter(s => !(s.day === ld && s.hour === lh && s.minute === lm)),
              };
            }
          });
          originals.delete(lastKey);
        }
      }
    },
    [selectedPerson, isSelectingMode, isSlotSelected]
  );

  // Handle touch move by hit-testing the element under the touch point
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isMouseDown.current) return;
      // Prevent page scroll while dragging
      e.preventDefault();

      const touch = e.touches[0];
      if (!touch) return;
      const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
      if (!el) return;

      const slotEl = el.closest('[data-slot="true"]') as HTMLElement | null;
      if (!slotEl) return;

      const day = parseInt(slotEl.dataset.day || "", 10);
      const hour = parseInt(slotEl.dataset.hour || "", 10);
      const minute = parseInt(slotEl.dataset.minute || "", 10);

      if (Number.isFinite(day) && Number.isFinite(hour) && Number.isFinite(minute)) {
        handleMouseEnter(day, hour, minute);
      }
    },
    [handleMouseEnter]
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

  const getSlotPercentage = (day: number, hour: number, minute: number) => {
    const count = getSlotCount(day, hour, minute);
    const totalPeople = users.length || 1; // avoid divide by zero
    return totalPeople ? Math.round((count / totalPeople) * 100) : 0;
  };

  const getSlotColor = (day: number, hour: number, minute: number) => {
    const percentage = getSlotPercentage(day, hour, minute);
    return `bg-gray-${percentage} hover:bg-gray-${percentage + 100}`;
  };

  const getPeopleAtSlot = (day: number, hour: number, minute: number) => {
    const peopleAtSlot: string[] = [];
    Object.entries(availability).forEach(([personId, slots]) => {
      if (slots.some(slot => slot.day === day && slot.hour === hour && slot.minute === minute)) {
        const person = users.find(p => p.id === personId);
        if (person) peopleAtSlot.push(person.name);
      }
    });
    return peopleAtSlot;
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
          <h1 className="text-3xl font-bold text-blue-500 mb-4">TLCrab - Calendário de Turnos</h1>

          <div className="flex flex-wrap gap-4 mb-6">
            {/* Pessoa Filter */}
            <div className="bg-white p-4 rounded-lg shadow flex-1 min-w-64">
              <label
                htmlFor="person-search"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Selecionar Pessoa:
              </label>
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <input
                    ref={inputRef}
                    id="person-search"
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    placeholder="Digite o nome..."
                    className={`block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm 
            focus:outline-none focus:ring-blue-500 focus:border-blue-500 
            ${searchTerm.trim() === "" ? "text-gray-400" : "text-black"}`}
                  />
                  {selectedPerson && (
                    <button
                      onClick={clearSelection}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {isDropdownOpen && filteredPeople.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredPeople.map(person => (
                      <button
                        key={person.id}
                        onClick={() => handlePersonSelect(person)}
                        className={`
                w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none
                ${selectedPerson === person.id ? "bg-blue-100 text-blue-900" : "text-gray-900"}
              `}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{person.name}</span>
                          <span className="text-sm text-gray-500">{person.area}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {isDropdownOpen && filteredPeople.length === 0 && searchTerm.trim() !== "" && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                    <div className="px-3 py-2 text-gray-500 text-sm">
                      Nenhuma pessoa encontrada para &quot;{searchTerm}&quot;
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Área Filter */}
            <div className="bg-white p-4 rounded-lg shadow flex-1 min-w-64">
              <label htmlFor="area-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Área:
              </label>
              <select
                id="area-filter"
                value={selectedArea}
                onChange={e => setSelectedArea(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700"
              >
                <option value="">Todas as Áreas</option>
                {departments.map(area => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
          </div>

           {/* Calendário */}
        <div className="bg-white rounded-lg shadow mb-8 overflow-x-auto">

          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Disponibilidade</h2>
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
                className={`bg-white divide-y divide-gray-200 select-noneopacity-50 pointer-events-none`}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {TIME_SLOTS.map((timeSlot, slotIndex) => (
                  <tr key={slotIndex}>
                    <td className="px-4 z-9  whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white border-r">
                      {/** Show start time - end time (end = next TIME_SLOTS index, wrapped) */}
                      {timeSlot.hour.toString().padStart(2, "0")}:
                      {timeSlot.minute.toString().padStart(2, "0")}
                      -
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
                              ${!selectedPerson ? "cursor-not-allowed opacity-50" : ""}
                              flex items-center justify-center relative group touch-manipulation
                            `}
                            onMouseDown={() =>
                              handleMouseDown(dayIndex, timeSlot.hour, timeSlot.minute)
                            }
                            onMouseEnter={() =>
                              handleMouseEnter(dayIndex, timeSlot.hour, timeSlot.minute)
                            }
                            onTouchStart={() => {
                                handleMouseDown(dayIndex, timeSlot.hour, timeSlot.minute);
                              
                            }}
                            onTouchEnd={handleMouseUp}
                            style={{ touchAction: 'none' }}
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

       

          {selectedPerson && (
            <div className="mt-8 bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Disponibilidade de {users.find(p => p.id === selectedPerson)?.name}
              </h3>
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
