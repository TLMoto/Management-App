"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import Navbar from "../../../components/Navbar";
import BackgroundLayout from "@/components/BackGroundLayout";

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

// Dados mock - 5 pessoas da TLMoto
const PEOPLE: Person[] = [
  { id: "1", name: "João Silva", area: "Dynamics" },
  { id: "2", name: "Maria Santos", area: "Electronics" },
  { id: "3", name: "Pedro Costa", area: "Aerodynamics" },
  { id: "4", name: "Ana Ferreira", area: "Business" },
  { id: "5", name: "Carlos Oliveira", area: "Powertrain" },
];

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const totalMinutes = 0 * 60 + i * 30;
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  return { hour, minute };
});

export default function TLCrabAnalise() {
  const [availability, setAvailability] = useState<AvailabilityData>({});

  const [selectedPerson, setSelectedPerson] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [filteredPeople, setFilteredPeople] = useState<Person[]>(PEOPLE);
  const [showIndividualCalendar, setShowIndividualCalendar] = useState<boolean>(false);

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

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredPeople(PEOPLE);
    } else {
      const filtered = PEOPLE.filter(
        person =>
          person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          person.area.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPeople(filtered);
    }
  }, [searchTerm]);

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
    setShowIndividualCalendar(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsDropdownOpen(true);

    if (value.trim() === "") {
      setSelectedPerson("");
      setShowIndividualCalendar(false);
    }
  };

  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };

  const clearSelection = () => {
    setSelectedPerson("");
    setSearchTerm("");
    setIsDropdownOpen(false);
    setShowIndividualCalendar(false);
    inputRef.current?.focus();
  };

  const isPersonAvailable = (day: number, hour: number, minute: number, personId: string) => {
    const personSlots = availability[personId] || [];
    return personSlots.some(
      slot => slot.day === day && slot.hour === hour && slot.minute === minute
    );
  };

  const getSlotCount = (day: number, hour: number, minute: number) => {
    return Object.values(availability).reduce((count, personSlots) => {
      return personSlots.some(
        slot => slot.day === day && slot.hour === hour && slot.minute === minute
      )
        ? count + 1
        : count;
    }, 0);
  };

  const getPeopleAtSlot = (day: number, hour: number, minute: number) => {
    const peopleAtSlot: string[] = [];
    Object.entries(availability).forEach(([personId, slots]) => {
      if (slots.some(slot => slot.day === day && slot.hour === hour && slot.minute === minute)) {
        const person = PEOPLE.find(p => p.id === personId);
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
      totalSlots: slots.length,
    };
  };

  const getOverallStats = () => {
    const totalSlots = 7 * 48;
    let filledSlots = 0;

    for (let day = 0; day < 7; day++) {
      TIME_SLOTS.forEach(timeSlot => {
        if (getSlotCount(day, timeSlot.hour, timeSlot.minute) > 0) {
          filledSlots++;
        }
      });
    }

    const coverage = Math.round((filledSlots / totalSlots) * 100);
    const averagePeoplePerSlot =
      Object.values(availability).reduce((sum, slots) => sum + slots.length, 0) / filledSlots || 0;

    return {
      coverage,
      filledSlots,
      totalSlots,
      averagePeoplePerSlot: Math.round(averagePeoplePerSlot * 10) / 10,
    };
  };

  const overallStats = getOverallStats();
  const selectedPersonData = selectedPerson ? PEOPLE.find(p => p.id === selectedPerson) : null;
  const selectedPersonStats = selectedPerson ? getPersonStats(selectedPerson) : null;

  return (
    <BackgroundLayout>
      <Navbar />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-500 mb-4">
            TLCrab - Análise de Disponibilidade
          </h1>
          <p className="text-gray-600">
            Visualização e estatísticas da disponibilidade da equipa TLMoto
          </p>
        </div>

        {/* motor de busca de Pessoa para Visualização Individual */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Calendário Individual</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-64">
              <label
                htmlFor="person-search"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Pesquisar Pessoa:
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
                    placeholder="Digite o nome ou área..."
                    className={`block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      searchTerm.trim() === "" ? "text-gray-400" : "text-black"
                    }`}
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

            {selectedPersonData && (
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>{selectedPersonData.name}</strong> - {selectedPersonData.area}
                </p>
                {selectedPersonStats && (
                  <p className="text-xs text-blue-600">
                    {selectedPersonStats.totalHours}h ({selectedPersonStats.weekPercentage}% da
                    semana)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Calendário Individual */}
        {showIndividualCalendar && selectedPerson && selectedPersonData && (
          <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Disponibilidade de {selectedPersonData.name}
                  </h3>
                  <p className="text-sm text-gray-600">{selectedPersonData.area}</p>
                </div>
                {selectedPersonStats && (
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">
                      {selectedPersonStats.totalHours}h
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedPersonStats.totalSlots} slots ({selectedPersonStats.weekPercentage}%)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r">
                      Hora
                    </th>
                    {DAYS.map((day, index) => (
                      <th
                        key={index}
                        className="px-1 sm:px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px] sm:min-w-[100px]"
                      >
                        <span className="hidden sm:inline">{day}</span>
                        <span className="sm:hidden">{day.substring(0, 3)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {TIME_SLOTS.map((timeSlot, slotIndex) => (
                    <tr key={slotIndex}>
                      <td className="px-2 sm:px-4 py-1 sm:py-2 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 sticky left-0 bg-white border-r z-10">
                        {timeSlot.hour.toString().padStart(2, "0")}:
                        {timeSlot.minute.toString().padStart(2, "0")}
                      </td>
                      {DAYS.map((_, dayIndex) => {
                        const isAvailable = isPersonAvailable(
                          dayIndex,
                          timeSlot.hour,
                          timeSlot.minute,
                          selectedPerson
                        );
                        const totalCount = getSlotCount(dayIndex, timeSlot.hour, timeSlot.minute);

                        return (
                          <td key={dayIndex} className="px-0.5 sm:px-1 py-1">
                            <div
                              className={`
                                h-6 sm:h-8 w-full border border-gray-200 transition-all duration-200 rounded
                                flex items-center justify-center relative
                                ${
                                  isAvailable
                                    ? "bg-green-500 text-white"
                                    : "bg-gray-100 text-gray-400"
                                }
                              `}
                              title={`${DAYS[dayIndex]} ${timeSlot.hour.toString().padStart(2, "0")}:${timeSlot.minute.toString().padStart(2, "0")} - ${isAvailable ? "Disponível" : "Não disponível"} (${totalCount} pessoas no total)`}
                            >
                              <span className="text-xs font-medium">{isAvailable ? "✓" : ""}</span>
                              {totalCount > 1 && (
                                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                  {totalCount}
                                </span>
                              )}
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
        )}

        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Cobertura Total</h3>
            <p className="text-3xl font-bold text-blue-600">{overallStats.coverage}%</p>
            <p className="text-sm text-gray-600">
              {overallStats.filledSlots} de {overallStats.totalSlots} slots
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Média por Slot</h3>
            <p className="text-3xl font-bold text-green-600">{overallStats.averagePeoplePerSlot}</p>
            <p className="text-sm text-gray-600">pessoas por slot ocupado</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Total de Pessoas</h3>
            <p className="text-3xl font-bold text-purple-600">{PEOPLE.length}</p>
            <p className="text-sm text-gray-600">membros da equipa</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              <Link href="/tlcrab" className="text-blue-600 hover:text-blue-800 transition-colors">
                Editar Turnos
              </Link>
            </h3>
            <p className="text-sm text-gray-600">Voltar à edição de turnos</p>
          </div>
        </div>

        {/* Estatísticas por Pessoa */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Estatísticas por Pessoa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PEOPLE.map(person => {
              const stats = getPersonStats(person.id);
              return (
                <div
                  key={person.id}
                  className={`
                    border rounded-lg p-4 cursor-pointer transition-all
                    ${
                      selectedPerson === person.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    }
                  `}
                  onClick={() => handlePersonSelect(person)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{person.name}</h4>
                      <p className="text-sm text-gray-600">{person.area}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{stats.totalHours}h</p>
                      <p className="text-sm text-gray-600">{stats.weekPercentage}% da semana</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stats.weekPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {stats.totalSlots} slots ocupados - Clique para ver calendário
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </BackgroundLayout>
  );
}
