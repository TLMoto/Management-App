"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { JSX } from 'react';
import { useUser } from "@/src/components/UserProvider";
import ProtectedPage from "@/src/components/ProtectedPage";
import { 
  getTurnos,
  getEventos,
  getAllUsers,
  TurnoAirtable 
} from "../api/airtable/airtable";
import { Evento, User } from "@/src/components/Interfaces"; 

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// 1. ATUALIZADA: Interface para suportar os novos campos e a flag virtual
interface TurnoLocal extends TurnoAirtable {
  diaSemana?: number; 
  dataCompleta?: string;
  isVirtual?: boolean;
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

const formatDateToDDMMYYYY = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const parseDateString = (dateStr: string): Date => {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
};

const isTurnoFuturo = (turno: TurnoLocal): boolean => {
  if (!turno.dataCompleta) return false;
  const turnoDate = parseDateString(turno.dataCompleta);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return turnoDate >= today;
};

// 2. NOVA FUNÇÃO: Gera as repetições virtuais para povoar o calendário
const expandirTurnosRecorrentes = (turnosOriginais: TurnoLocal[]): TurnoLocal[] => {
  const listaExpandida: TurnoLocal[] = [];

  turnosOriginais.forEach((turno) => {
    listaExpandida.push(turno); // Adiciona o real

    if (turno.tipo !== "Turno" && turno.dataLimiteRecorrencia) {
      const dataLimite = new Date(turno.dataLimiteRecorrencia);
      let dataReferencia = parseDateString(turno.dataCompleta!);

      while (true) {
        dataReferencia.setDate(dataReferencia.getDate() + 7);
        if (dataReferencia > dataLimite) break;

        listaExpandida.push({
          ...turno,
          id: `${turno.id}_virtual_${dataReferencia.getTime()}`,
          dataCompleta: formatDateToDDMMYYYY(new Date(dataReferencia)),
          isVirtual: true // Marca como repetição
        });
      }
    }
  });

  return listaExpandida;
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
  
  const startDate = new Date(firstDayOfMonth);
  const dayOfWeek = firstDayOfMonth.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startDate.setDate(firstDayOfMonth.getDate() - daysToSubtract);
  
  const days: DiaCalendario[] = [];
  const today = new Date();
  
  for (let i = 0; i < 42; i++) { 
    const currentDay = new Date(startDate);
    currentDay.setDate(startDate.getDate() + i);
    
    const dayTurnos = turnos.filter(turno => {
      if (!turno.dataCompleta) return false;
      const turnoDate = parseDateString(turno.dataCompleta);
      return isSameDay(turnoDate, currentDay);
    });
    
    // Ordenar turnos do dia por hora de início
    dayTurnos.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    
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

// HELPER DE CORES
const getCorPorTipo = (tipo?: string, isPassado?: boolean) => {
  if (isPassado) return 'bg-gray-400 text-white border-gray-500';
  switch (tipo) {
    case 'Worksession': return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'Reunião': return 'bg-orange-100 text-orange-800 border-orange-300';
    default: return 'bg-blue-100 text-blue-800 border-blue-300';
  }
};

export default function Calendario(): JSX.Element {
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

  const getNomeEvento = (id: string) => eventos.find(e => e.id === id)?.nome || "---";

  // Calendar days
  const calendarDays = useMemo(() => {
    return generateCalendarDays(currentMonth, turnos);
  }, [currentMonth, turnos]);

  useEffect(() => {
    loadTurnos();
    loadEventos();
    fetchAirtableUsers();
  }, []);

  // --- ACTIONS ---
  const loadTurnos = async () => {
    setIsLoading(true);
    try {
      const data = await getTurnos();
      const processados: TurnoLocal[] = data.map(turno => ({
        ...turno,
        diaSemana: getWeekDayFromDate(turno.data),
        dataCompleta: turno.data
      }));
      
      // 3. ATUALIZADA: Aplicar a expansão antes de guardar no estado
      setTurnos(expandirTurnosRecorrentes(processados));
    } catch (error) {
      console.error("Erro ao carregar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEventos = async () => {
    try {
      const data = await getEventos();
      setEventos(data || []);
    } catch (error) { setEventos([]); }
  };

  async function fetchAirtableUsers() {
    try { 
      const users = await getAllUsers(); 
      setAirtableUsers(users); 
    } catch (e) { console.error(e); }
  }

  // --- NAVIGATION ---
  const goToPreviousMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const goToToday = () => setCurrentMonth(new Date());


  return (
    <ProtectedPage>
      <main className="min-h-screen flex flex-col pt-20 px-4 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl text-white font-semibold">Calendário Geral</h1>
          <button 
            onClick={() => loadTurnos()} 
            disabled={isLoading} 
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
          >
            <span className={isLoading ? "animate-spin" : ""}>↻</span>
            {isLoading ? "A carregar..." : "Refrescar"}
          </button>
        </div>

        {/* CALENDAR VIEW */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 capitalize">
                {MESES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={goToPreviousMonth} className="p-2 hover:bg-gray-200 text-gray-600 rounded-lg transition font-bold text-lg">←</button>
                <button onClick={goToToday} className="px-4 py-1 text-sm bg-blue-100 text-blue-700 font-bold rounded hover:bg-blue-200 transition">Hoje</button>
                <button onClick={goToNextMonth} className="p-2 hover:bg-gray-200 text-gray-600 rounded-lg transition font-bold text-lg">→</button>
              </div>
            </div>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 bg-white border-b border-gray-200">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
              <div key={day} className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase">{day}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((dia, index) => (
              <div
                key={index}
                className={`min-h-[140px] p-2 border-b border-r border-gray-100 cursor-pointer transition 
                  ${!dia.isCurrentMonth ? 'bg-gray-50/50' : 'bg-white hover:bg-gray-50'} 
                  ${dia.isToday ? 'ring-2 ring-inset ring-blue-500 bg-blue-50/10' : ''}
                `}
                onClick={() => setSelectedDay(dia)}
              >
                <div className={`text-sm font-bold mb-2 ${!dia.isCurrentMonth ? 'text-gray-400' : dia.isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                  {dia.day}
                </div>
                
                <div className="space-y-1.5 overflow-hidden">
                  {dia.turnos.slice(0, 4).map(turno => {
                    const isPassado = !isTurnoFuturo(turno);
                    const corClasses = getCorPorTipo(turno.tipo, isPassado);
                    
                    return (
                      <div
                        key={turno.id}
                        className={`text-[10px] px-1.5 py-1 rounded border leading-tight truncate font-medium ${corClasses} ${turno.isVirtual ? 'border-dashed' : ''}`}
                        title={`${turno.nome || turno.tipo} (${turno.horaInicio}-${turno.horaFim})`}
                      >
                        <span className="font-bold mr-1">{turno.horaInicio}</span>
                        {/* 4. ATUALIZADA: Mostra o Nome em vez do Evento */}
                        {turno.nome || turno.tipo || "Turno"}
                      </div>
                    );
                  })}
                  {dia.turnos.length > 4 && (
                    <div className="text-[10px] text-gray-500 font-bold text-center mt-1">
                      +{dia.turnos.length - 4} marcações
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MODAL DETALHE DO DIA */}
        {selectedDay && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
                <h2 className="text-xl font-bold text-gray-800">
                  {selectedDay.day} de {MESES[selectedDay.date.getMonth()]} {selectedDay.date.getFullYear()}
                </h2>
                <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-black text-2xl leading-none">×</button>
              </div>
              
              <div className="p-5 overflow-y-auto flex-1 bg-white">
                {selectedDay.turnos.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <p className="text-lg mb-1"></p>
                    <p>Dia livre! Não há nada marcado.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedDay.turnos.map(turno => {
                       const isPassado = !isTurnoFuturo(turno);
                       return (
                        <div key={turno.id} className={`border rounded-lg p-4 relative ${isPassado ? 'bg-gray-50 border-gray-200' : 'border-gray-200 hover:border-blue-300 transition'}`}>
                          
                          {turno.isVirtual && (
                            <span className="absolute top-4 right-4 text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded font-medium border border-blue-100">
                              Repetição Semanal
                            </span>
                          )}

                          <div className="mb-3 pr-24">
                            <div className="flex items-center gap-2 mb-1">
                              {/* BADGE DE TIPO */}
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${getCorPorTipo(turno.tipo, isPassado)}`}>
                                {turno.tipo || "Turno"}
                              </span>
                              {isPassado && <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-gray-200 text-gray-600">Concluído</span>}
                            </div>
                            
                            {/* TITULO (Nome) */}
                            <h3 className={`text-lg font-bold ${isPassado ? 'text-gray-500' : 'text-gray-900'}`}>
                              {turno.nome || "Sem título"}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">Evento: {getNomeEvento(turno.eventoId)}</p>
                          </div>
                          
                          <div className={`space-y-1.5 text-sm ${isPassado ? 'text-gray-500' : 'text-gray-700'}`}>
                            <p className="flex items-center gap-2">
                              <span className="font-semibold w-24">Horário:</span> 
                              {turno.horaInicio} às {turno.horaFim}
                            </p>
                            <p className="flex items-center gap-2">
                              <span className="font-semibold w-24">Responsável:</span> 
                              {getNomeParticipanteParaTabela(turno.responsavelId)}
                            </p>
                            <p className="flex items-start gap-2">
                              <span className="font-semibold w-24 shrink-0">👥 Equipa:</span> 
                              <span>{turno.participantesIds.map(id => getNomeParticipanteParaTabela(id)).join(', ')}</span>
                            </p>
                            {turno.observacoes && (
                              <p className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-100">
                                <span className="font-semibold w-24 shrink-0 text-gray-500">📝 Notas:</span> 
                                <span className="italic text-gray-600">{turno.observacoes}</span>
                              </p>
                            )}
                          </div>
                        </div>
                       );
                    })}
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