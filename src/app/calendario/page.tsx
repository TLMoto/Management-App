"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { JSX } from 'react';
import { useUser } from "@/src/components/UserProvider";
import ProtectedPage from "@/src/components/ProtectedPage";
import { 
  EventosService, 
  TurnosService, 
  ControloPresencasService,
  TurnoAirtable 
} from "../api/airtable/airtable";
import { getPeopleAvailability, PeopleAvailabilityResponse } from "../api/crab/api";
import { Evento, User } from "@/src/components/Interfaces"; 

const DIAS_SEMANA = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface TurnoLocal extends TurnoAirtable {
  diaSemana?: number; 
  dataCompleta?: string;
}

interface DiaCalendario {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  turnos: TurnoLocal[];
}

// --- HELPERS ---
const getWeekDayFromDate = (dateStr: string): number => {
  if (!dateStr) return 0;
  const [day, month, year] = dateStr.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getDay();
};

const isTurnoFuturo = (turno: TurnoLocal): boolean => {
  if (!turno.dataCompleta) return false;
  const [day, month, year] = turno.dataCompleta.split('/').map(Number);
  const turnoDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return turnoDate >= today;
};

const parseDateString = (dateStr: string): Date => {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

const generateCalendarDays = (currentDate: Date, turnos: TurnoLocal[]): DiaCalendario[] => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  // Começar na segunda-feira
  const startDate = new Date(firstDayOfMonth);
  const dayOfWeek = firstDayOfMonth.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startDate.setDate(firstDayOfMonth.getDate() - daysToSubtract);
  
  const days: DiaCalendario[] = [];
  const today = new Date();
  
  for (let i = 0; i < 42; i++) { // 6 semanas × 7 dias
    const currentDay = new Date(startDate);
    currentDay.setDate(startDate.getDate() + i);
    
    const dayTurnos = turnos.filter(turno => {
      if (!turno.dataCompleta) return false;
      const turnoDate = parseDateString(turno.dataCompleta);
      return isSameDay(turnoDate, currentDay);
    });
    
    days.push({
      date: new Date(currentDay),
      day: currentDay.getDate(),
      isCurrentMonth: currentDay.getMonth() === month,
      isToday: isSameDay(currentDay, today),
      turnos: dayTurnos
    });
  }
  
  return days;
};

export default function Turnos(): JSX.Element {
  const { user } = useUser();

  // --- ESTADOS ---
  const [turnos, setTurnos] = useState<TurnoLocal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DiaCalendario | null>(null);

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [airtableUsers, setAirtableUsers] = useState<User[]>([]); 

  // --- HELPERS PARA UI ---
  const getNomeParticipanteParaTabela = (id: string) => {
    const foundRec = airtableUsers.find(u => u.id === id);
    if (foundRec) return foundRec.nome;
    const foundIst = airtableUsers.find(u => u.istId?.toString() === id);
    if (foundIst) return foundIst.nome;
    return id || "---";
  };

  const getNomeEvento = (id: string) => eventos.find(e => e.id === id)?.nome || "Desconhecido";

  // Calendar days
  const calendarDays = useMemo(() => {
    return generateCalendarDays(currentMonth, turnos);
  }, [currentMonth, turnos]);

  // Carregamento Inicial
  useEffect(() => {
    loadTurnos();
    loadEventos();
    fetchAirtableUsers();
  }, []);

  // --- ACTIONS ---
  const loadTurnos = () => {
    setIsLoading(true);
    setTimeout(async () => {
      try {
        const data = await TurnosService.getTurnos();
        const turnosProcessados: TurnoLocal[] = data.map(turno => ({
          ...turno,
          diaSemana: getWeekDayFromDate(turno.data),
          dataCompleta: turno.data
        }));
        setTurnos(turnosProcessados);
      } catch (error) {
        console.error("Erro ao carregar turnos:", error);
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  const loadEventos = () => {
    setTimeout(async () => {
      try {
        const data = await EventosService.getEventos();
        setEventos(data || []);
      } catch (error) {
        console.error("Erro ao carregar eventos:", error);
        setEventos([]);
      }
    }, 500);
  };

  async function fetchAirtableUsers() {
    try { 
      const users = await ControloPresencasService.getAllUsers(); 
      setAirtableUsers(users); 
    } catch (e) { 
      console.error(e); 
    }
  }

  // --- NAVIGATION ---
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const apagarTurno = async (idTurno: string) => {
    if (window.confirm("Tem a certeza que deseja excluir este turno?")) {
      try {
        await TurnosService.apagarTurno(idTurno);
        loadTurnos();
      } catch (error) {
        console.error(error);
        alert("Erro ao apagar turno.");
      }
    }
  };

  const CalendarView = () => (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {MESES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-800 rounded-lg transition"
            >
              ←
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
            >
              Hoje
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-800 rounded-lg transition"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
          <div key={day} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((dia, index) => (
          <div
            key={index}
            className={`min-h-[120px] p-2 border-b border-r border-gray-100 cursor-pointer hover:bg-gray-50 transition ${
              !dia.isCurrentMonth ? 'bg-gray-50' : ''
            } ${dia.isToday ? 'bg-blue-50' : ''}`}
            onClick={() => setSelectedDay(dia)}
          >
            <div className={`text-sm font-medium mb-1 ${
              !dia.isCurrentMonth 
                ? 'text-gray-400' 
                : dia.isToday 
                  ? 'text-blue-600' 
                  : 'text-gray-900'
            }`}>
              {dia.day}
            </div>
            
            <div className="space-y-1">
              {dia.turnos.slice(0, 3).map(turno => (
                <div
                  key={turno.id}
                  className={`text-xs px-2 py-1 rounded text-white truncate ${
                    isTurnoFuturo(turno) ? 'bg-blue-500' : 'bg-gray-500'
                  }`}
                  title={`${getNomeEvento(turno.eventoId)} (${turno.horaInicio}-${turno.horaFim})`}
                >
                  {turno.horaInicio} {getNomeEvento(turno.eventoId)}
                </div>
              ))}
              {dia.turnos.length > 3 && (
                <div className="text-xs text-gray-500 text-center">
                  +{dia.turnos.length - 3} mais
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <ProtectedPage>
      <main className="min-h-screen flex flex-col pt-20 px-4 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl text-white font-semibold">Calendário de Turnos</h1>
        </div>

        <div className="flex justify-start items-center mb-6">
          <button 
            onClick={() => loadTurnos()} 
            disabled={isLoading} 
            className="bg-white hover:bg-gray-100 text-black px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span className={isLoading ? "animate-spin" : ""}>↻</span>
            {isLoading ? "A carregar..." : "Refrescar"}
          </button>
        </div>

        {/* Calendar */}
        <CalendarView />

        {/* Day Detail Modal */}
        {selectedDay && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Turnos de {selectedDay.day} de {MESES[selectedDay.date.getMonth()]} {selectedDay.date.getFullYear()}
                </h2>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                {selectedDay.turnos.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhum turno marcado para este dia</p>
                ) : (
                  <div className="space-y-4">
                    {selectedDay.turnos.map(turno => (
                      <div key={turno.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900">{getNomeEvento(turno.eventoId)}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isTurnoFuturo(turno) 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {isTurnoFuturo(turno) ? 'Futuro' : 'Passado'}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <p><strong>Horário:</strong> {turno.horaInicio} - {turno.horaFim}</p>
                          <p><strong>Responsável:</strong> {getNomeParticipanteParaTabela(turno.responsavelId)}</p>
                          <p><strong>Participantes:</strong> {turno.participantesIds.map(id => getNomeParticipanteParaTabela(id)).join(', ')}</p>
                          {turno.observacoes && (
                            <p><strong>Observações:</strong> {turno.observacoes}</p>
                          )}
                        </div>
                        
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => {
                              setSelectedDay(null);
                              apagarTurno(turno.id!);
                            }}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </ProtectedPage>
  );
}