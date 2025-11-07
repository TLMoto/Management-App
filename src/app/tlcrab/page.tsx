"use client";


//alterar o tlcrab edição para um pop up, ou seja por tudo na mesma pagina


import Link from "next/link";
import { useState, useCallback, useRef, useEffect } from "react";
import Navbar from "../../components/Navbar";
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

// Dados mock - 5 pessoas 
const PEOPLE: Person[] = [
  { id: '1', name: 'João Silva', area: 'Dynamics' },
  { id: '2', name: 'Maria Santos', area: 'Electronics' },
  { id: '3', name: 'Pedro Costa', area: 'Aerodynamics' },
  { id: '4', name: 'Ana Ferreira', area: 'Business' },
  { id: '5', name: 'Carlos Oliveira', area: 'Powertrain' },
];

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const totalMinutes = (8 * 60) + (i * 30);
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  return { hour, minute };
});

export default function TLCrab() {
  const [selectedPerson, setSelectedPerson] = useState<string>('');
  const [availability, setAvailability] = useState<AvailabilityData>({});
  const [dragStart, setDragStart] = useState<{ day: number; hour: number; minute: number } | null>(null);
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [filteredPeople, setFilteredPeople] = useState<Person[]>(PEOPLE);
  
  const isMouseDown = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carregar dados do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tlcrab-availability');
    if (saved) {
      try {
        setAvailability(JSON.parse(saved));
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      }
    }
  }, []);

  // Salvar dados no localStorage
  useEffect(() => {
    localStorage.setItem('tlcrab-availability', JSON.stringify(availability));
  }, [availability]);

  // Filtrar pessoas baseado no termo de pesquisa
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPeople(PEOPLE);
    } else {
      const filtered = PEOPLE.filter(person => 
        person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.area.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPeople(filtered);
    }
  }, [searchTerm]);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
    if (value.trim() === '') {
      setSelectedPerson('');
    }
  };

  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };

  const clearSelection = () => {
    setSelectedPerson('');
    setSearchTerm('');
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  const toggleTimeSlot = useCallback((day: number, hour: number, minute: number) => {
    if (!selectedPerson) return;
    
    setAvailability(prev => {
      const personSlots = prev[selectedPerson] || [];
      const existingIndex = personSlots.findIndex(slot => slot.day === day && slot.hour === hour && slot.minute === minute);
      
      if (existingIndex !== -1) {
        return {
          ...prev,
          [selectedPerson]: personSlots.filter(slot => !(slot.day === day && slot.hour === hour && slot.minute === minute))
        };
      } else {
        return {
          ...prev,
          [selectedPerson]: [...personSlots, { day, hour, minute }]
        };
      }
    });
  }, [selectedPerson]);

  const handleMouseDown = useCallback((day: number, hour: number, minute: number) => {
    if (!selectedPerson) return;
    
    isMouseDown.current = true;
    setDragStart({ day, hour, minute });
    toggleTimeSlot(day, hour, minute);
  }, [selectedPerson, toggleTimeSlot]);

  const handleMouseUp = useCallback(() => {
    isMouseDown.current = false;
    setDragStart(null);
  }, []);

  const handleMouseEnter = useCallback((day: number, hour: number, minute: number) => {
    if (!isMouseDown.current || !selectedPerson || !dragStart) return;
    
    const startDay = Math.min(dragStart.day, day);
    const endDay = Math.max(dragStart.day, day);
    const startSlotIndex = TIME_SLOTS.findIndex(slot => slot.hour === dragStart.hour && slot.minute === dragStart.minute);
    const endSlotIndex = TIME_SLOTS.findIndex(slot => slot.hour === hour && slot.minute === minute);
    const startSlot = Math.min(startSlotIndex, endSlotIndex);
    const endSlot = Math.max(startSlotIndex, endSlotIndex);
    
    const newSlots: TimeSlot[] = [];
    for (let d = startDay; d <= endDay; d++) {
      for (let s = startSlot; s <= endSlot; s++) {
        newSlots.push({ day: d, hour: TIME_SLOTS[s].hour, minute: TIME_SLOTS[s].minute });
      }
    }
    
    setAvailability(prev => ({
      ...prev,
      [selectedPerson]: [
        ...(prev[selectedPerson] || []).filter(slot => 
          !newSlots.some(newSlot => newSlot.day === slot.day && newSlot.hour === slot.hour && newSlot.minute === slot.minute)
        ),
        ...newSlots
      ]
    }));
  }, [selectedPerson, dragStart]);

  const isSlotSelected = (day: number, hour: number, minute: number) => {
    if (!selectedPerson) return false;
    const personSlots = availability[selectedPerson] || [];
    return personSlots.some(slot => slot.day === day && slot.hour === hour && slot.minute === minute);
  };

  const getSlotCount = (day: number, hour: number, minute: number) => {
    return Object.values(availability).reduce((count, personSlots) => {
      return personSlots.some(slot => slot.day === day && slot.hour === hour && slot.minute === minute) ? count + 1 : count;
    }, 0);
  };

  const getSlotPercentage = (day: number, hour: number, minute: number) => {
    const count = getSlotCount(day, hour, minute);
    const totalPeople = PEOPLE.length;
    return totalPeople ? Math.round((count / totalPeople) * 100) : 0;
  }


  const getSlotColor = (day: number, hour: number, minute: number) => {
    const percentage = getSlotPercentage(day, hour, minute);
    if (percentage === 0) return 'bg-gray-100 hover:bg-gray-200';
    if (percentage <= 25) return 'bg-blue-300 hover:bg-blue-400';
    if (percentage <= 50) return 'bg-blue-400 hover:bg-blue-500';
    if (percentage <= 75) return 'bg-blue-500 hover:bg-blue-600';
    if (percentage <= 100) return 'bg-blue-600 hover:bg-blue-700';
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
      totalHours: Math.round((slots.length * 0.5) * 10) / 10,
      weekPercentage: Math.round((slots.length / (7 * 48)) * 100),
    };
  };

  return (
    <BackgroundLayout>
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-500 mb-4">
            TLCrab - Gestão de Turnos
          </h1>

          <div className="flex flex-wrap gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow flex-1 min-w-64">
              <label htmlFor="person-search" className="block text-sm font-medium text-gray-700 mb-2">
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
                    placeholder="Digite o nome ou área..."
                    className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  {selectedPerson && (
                    <button
                      onClick={clearSelection}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {isDropdownOpen && filteredPeople.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredPeople.map((person) => (
                      <button
                        key={person.id}
                        onClick={() => handlePersonSelect(person)}
                        className={`
                          w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none
                          ${selectedPerson === person.id ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}
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

                {isDropdownOpen && filteredPeople.length === 0 && searchTerm.trim() !== '' && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                    <div className="px-3 py-2 text-gray-500 text-sm">
                      Nenhuma pessoa encontrada para &quot;{searchTerm}&quot;
                    </div>
                  </div>
                )}
              </div>
            </div>

            
            <div className="bg-blue-50 p-4 rounded-lg shadow">
              <p className="text-sm text-blue-800 mb-2">
                Ver estatísticas e análise detalhada?
              </p>
              <Link 
                href="/tlcrab/analise"
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors inline-block"
              >
                Ir para Análise
              </Link>
            </div>
          </div>
  

        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Calendário de Edição</h2>
            <p className="text-sm text-gray-600">Selecione uma pessoa e clique/arraste para definir disponibilidade</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                    Hora
                  </th>
                  {DAYS.map((day, index) => (
                    <th key={index} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody 
                className="bg-white divide-y divide-gray-200"
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {TIME_SLOTS.map((timeSlot, slotIndex) => (
                  <tr key={slotIndex}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white border-r">
                      {timeSlot.hour.toString().padStart(2, '0')}:{timeSlot.minute.toString().padStart(2, '0')}
                    </td>
                    {DAYS.map((_, dayIndex) => {
                      const count = getSlotCount(dayIndex, timeSlot.hour, timeSlot.minute);
                      const isSelected = isSlotSelected(dayIndex, timeSlot.hour, timeSlot.minute);
                      const people = getPeopleAtSlot(dayIndex, timeSlot.hour, timeSlot.minute);
                      
                      return (
                        <td key={dayIndex} className="px-1 py-1">
                          <div
                            className={`
                              h-8 w-full cursor-pointer border border-gray-200 transition-all duration-200 rounded
                              ${isSelected ? 'ring-2 ring-blue-500 bg-blue-100' : getSlotColor(dayIndex, timeSlot.hour, timeSlot.minute)}
                              ${!selectedPerson ? 'cursor-not-allowed opacity-50' : ''}
                              flex items-center justify-center relative group
                            `}
                            onMouseDown={() => handleMouseDown(dayIndex, timeSlot.hour, timeSlot.minute)}
                            onMouseEnter={() => handleMouseEnter(dayIndex, timeSlot.hour, timeSlot.minute)}
                            title={`${DAYS[dayIndex]} ${timeSlot.hour.toString().padStart(2, '0')}:${timeSlot.minute.toString().padStart(2, '0')} - ${count} pessoas: ${people.join(', ')}`}
                          >
                            <span className="text-xs font-medium text-gray-700">
                              {count || ''}
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
              Disponibilidade de {PEOPLE.find(p => p.id === selectedPerson)?.name}
            </h3>
            {(() => {
              const stats = getPersonStats(selectedPerson);
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {stats.totalHours}h
                    </p>
                    <p className="text-sm text-gray-600">Horas Totais</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {stats.weekPercentage}%
                    </p>
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
    </BackgroundLayout>
  );
}