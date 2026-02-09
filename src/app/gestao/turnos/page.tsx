"use client";
import ProtectedPage from "@/src/components/ProtectedPage";
import { useUser } from "@/src/components/UserProvider";
import React, { JSX, useEffect, useState, useMemo } from "react";

import { 
  EventosService, 
  TurnosService, 
  ControloPresencasService,
  TurnoAirtable 
} from "../../api/airtable/airtable";
import { Evento, User } from "@/src/components/Interfaces"; 
import { getPeopleAvailability, PeopleAvailabilityResponse } from "../../api/crab/api";

const API_EVENT_ID = "tlmotopresencial-669665";

const DIAS_SEMANA = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

interface TurnoLocal extends TurnoAirtable {
  diaSemana?: number; 
  dataCompleta?: string;
}

interface ParticipanteDisponivel {
  name: string;        
  istId: string;
  nomeReal: string;    
  nomeCompleto: string;
  availability: string[];
  matchPercentage: number; 
  matchedSlots: number;    
  totalSlotsRequired: number; 
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

const getNextDateForWeekday = (weekday: number): string => {
  const today = new Date();
  const daysUntilTarget = (weekday - today.getDay() + 7) % 7;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
  return formatDateToDDMMYYYY(targetDate);
};

const isTurnoFuturo = (turno: TurnoLocal): boolean => {
  if (!turno.dataCompleta) return false;
  const [day, month, year] = turno.dataCompleta.split('/').map(Number);
  const turnoDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return turnoDate >= today;
};

export default function Turnos(): JSX.Element {
  const { user } = useUser();

  // --- ESTADOS ---
  const [turnos, setTurnos] = useState<TurnoLocal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "historical">("active");

  // Filter states
  const [filterNomeAtivo, setFilterNomeAtivo] = useState("");
  const [filterParticipanteAtivo, setFilterParticipanteAtivo] = useState("");
  const [filterNomeHistorico, setFilterNomeHistorico] = useState("");
  const [filterParticipanteHistorico, setFilterParticipanteHistorico] = useState("");

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [airtableUsers, setAirtableUsers] = useState<User[]>([]); 

  // Form states
  const [dataEspecifica, setDataEspecifica] = useState(""); 
  const [usarDataEspecifica, setUsarDataEspecifica] = useState(false);
  const [diaSemana, setDiaSemana] = useState<number | "">("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [eventoSelecionado, setEventoSelecionado] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [responsavelSelecionadoId, setResponsavelSelecionadoId] = useState("");
  
  // Data states
  const [participantesCrabFit, setParticipantesCrabFit] = useState<PeopleAvailabilityResponse[]>([]);
  const [participantesDisponiveis, setParticipantesDisponiveis] = useState<ParticipanteDisponivel[]>([]);
  const [isLoadingParticipantes, setIsLoadingParticipantes] = useState(false);
  const [participantesSelecionadosIds, setParticipantesSelecionadosIds] = useState<string[]>([]);

    // --- HELPERS PARA UI ---
  const getRecordId = (istId: string): string | null => {
    const found = airtableUsers.find(u => u.istId?.toString() === istId);
    return found ? found.id : null;
  };

  const getNomeParticipanteParaTabela = (id: string) => {
    const foundRec = airtableUsers.find(u => u.id === id);
    if (foundRec) return foundRec.nome;
    const foundIst = airtableUsers.find(u => u.istId?.toString() === id);
    if (foundIst) return foundIst.nome;
    return id || "---";
  };

  const getNomeEvento = (id: string) => eventos.find(e => e.id === id)?.nome || "Desconhecido";
  const getNomeDiaSemana = (dia: number) => DIAS_SEMANA.find(d => d.value === dia)?.label || "Desconhecido";

  // Filtered turnos
  const turnosAtivos = useMemo(() => turnos.filter(isTurnoFuturo), [turnos]);
  const turnosHistoricos = useMemo(() => turnos.filter(turno => !isTurnoFuturo(turno)), [turnos]);

  const filteredTurnosAtivos = useMemo(() => {
    return turnosAtivos.filter(turno => {
      const matchesNome = filterNomeAtivo === "" || 
        getNomeEvento(turno.eventoId).toLowerCase().includes(filterNomeAtivo.toLowerCase());
      
      const matchesParticipante = filterParticipanteAtivo === "" ||
        turno.participantesIds.some(id => 
          getNomeParticipanteParaTabela(id).toLowerCase().includes(filterParticipanteAtivo.toLowerCase())
        ) ||
        getNomeParticipanteParaTabela(turno.responsavelId).toLowerCase().includes(filterParticipanteAtivo.toLowerCase());

      return matchesNome && matchesParticipante;
    });
  }, [turnosAtivos, filterNomeAtivo, filterParticipanteAtivo, eventos, airtableUsers]);

  const filteredTurnosHistoricos = useMemo(() => {
    return turnosHistoricos.filter(turno => {
      const matchesNome = filterNomeHistorico === "" || 
        getNomeEvento(turno.eventoId).toLowerCase().includes(filterNomeHistorico.toLowerCase());
      
      const matchesParticipante = filterParticipanteHistorico === "" ||
        turno.participantesIds.some(id => 
          getNomeParticipanteParaTabela(id).toLowerCase().includes(filterParticipanteHistorico.toLowerCase())
        ) ||
        getNomeParticipanteParaTabela(turno.responsavelId).toLowerCase().includes(filterParticipanteHistorico.toLowerCase());

      return matchesNome && matchesParticipante;
    });
  }, [turnosHistoricos, filterNomeHistorico, filterParticipanteHistorico, eventos, airtableUsers]);

  // Carregamento Inicial
  useEffect(() => {
    loadTurnos();
    loadEventos();
    fetchAirtableUsers();
    fetchPeopleFixed();
  }, []);

  // Recalcular participantes ao mudar inputs
  useEffect(() => {
    processarParticipantesDisponiveis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantesCrabFit, user, diaSemana, dataEspecifica, usarDataEspecifica, horaInicio, horaFim, airtableUsers]);

  // Limpar responsável
  useEffect(() => {
    if (responsavelSelecionadoId && !participantesSelecionadosIds.includes(responsavelSelecionadoId)) {
      setResponsavelSelecionadoId("");
    }
  }, [participantesSelecionadosIds, responsavelSelecionadoId]);

  // --- ACTIONS ---

  // Load dos turnos no estilo da página de eventos
  const loadTurnos = () => {
    setIsLoading(true);
    // Simulate API call
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

  // Load dos eventos no estilo da página de eventos
  const loadEventos = () => {
  setTimeout(async () => {
    try {
      const data = await EventosService.getEventos();
      // Handle null case by providing empty array as fallback
      setEventos(data || []);
    } catch (error) {
      console.error("Erro ao carregar eventos:", error);
      // Also set empty array on error
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

  async function fetchPeopleFixed() {
    setIsLoadingParticipantes(true);
    try { 
      const data = await getPeopleAvailability(API_EVENT_ID); 
      setParticipantesCrabFit(data); 
    } catch (e) { 
      console.error(e); 
    } finally { 
      setIsLoadingParticipantes(false); 
    }
  }

  const generateRequiredSlots = (start: string, end: string, day: number): string[] => {
    const slots: string[] = [];
    if (!start || !end) return slots;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let currentMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    while (currentMins < endMins) {
      const h = Math.floor(currentMins / 60);
      const m = currentMins % 60;
      slots.push(`${h.toString().padStart(2, '0')}${m.toString().padStart(2, '0')}-${day}`);
      currentMins += 30;
    }
    return slots;
  };

  const processarParticipantesDisponiveis = () => {
    if (!participantesCrabFit || participantesCrabFit.length === 0) {
      setParticipantesDisponiveis([]);
      return;
    }
    let requiredSlots: string[] = [];
    let dayToUse: number | undefined;

    if (usarDataEspecifica && dataEspecifica) {
      dayToUse = getWeekDayFromDate(dataEspecifica);
    } else if (!usarDataEspecifica && diaSemana !== "") {
      dayToUse = diaSemana as number;
    }

    if (dayToUse !== undefined && horaInicio && horaFim) {
      requiredSlots = generateRequiredSlots(horaInicio, horaFim, dayToUse);
    }

    const participantesProcessados = participantesCrabFit.map(pessoa => {
      const userAirtable = airtableUsers.find(u => u.istId?.toString() === pessoa.name);
      const realName = userAirtable ? userAirtable.nome : pessoa.name; 
      const isCurrentUser = user?.istId?.toString() === pessoa.name;
      const displayName = isCurrentUser ? `${realName} (Eu)` : realName;
      let matchPercentage = 0;
      let matchedSlots = 0;
      if (requiredSlots.length > 0) {
        matchedSlots = requiredSlots.filter(slot => pessoa.availability.includes(slot)).length;
        matchPercentage = (matchedSlots / requiredSlots.length) * 100;
      } else { matchPercentage = 100; }

      return {
        name: pessoa.name, istId: pessoa.name, nomeReal: realName, nomeCompleto: displayName,
        availability: pessoa.availability, matchPercentage, matchedSlots, totalSlotsRequired: requiredSlots.length
      };
    });

    participantesProcessados.sort((a, b) => {
      if (Math.abs(b.matchPercentage - a.matchPercentage) > 0.1) return b.matchPercentage - a.matchPercentage;
      if (a.istId === user?.istId?.toString()) return -1;
      if (b.istId === user?.istId?.toString()) return 1;
      return a.nomeCompleto.localeCompare(b.nomeCompleto);
    });

    setParticipantesDisponiveis(participantesProcessados);
  };

  const toggleParticipante = (id: string) => {
    setParticipantesSelecionadosIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };



  // --- CRIAR TURNO ---
  const criarTurno = async () => {
    try {
      let dataFinal: string;
      
      if (usarDataEspecifica && dataEspecifica) {
        dataFinal = dataEspecifica;
      } else if (!usarDataEspecifica && diaSemana !== "") {
        dataFinal = getNextDateForWeekday(diaSemana as number);
      } else {
        alert("Selecione uma data!");
        return;
      }

      if (!eventoSelecionado || !horaInicio || !horaFim || participantesSelecionadosIds.length === 0 || !responsavelSelecionadoId) {
        alert("Preencha todos os campos obrigatórios!");
        return;
      }

      const responsavelRecId = getRecordId(responsavelSelecionadoId);
      if (!responsavelRecId) {
        alert("Erro: Responsável não encontrado na base de dados Airtable.");
        return;
      }

      const participantesRecIds = participantesSelecionadosIds
        .map(id => getRecordId(id))
        .filter((id): id is string => id !== null);

      setIsLoading(true);

      const turnoData: Omit<TurnoAirtable, 'id'> = {
        data: dataFinal,
        horaInicio,
        horaFim,
        eventoId: eventoSelecionado,
        participantesIds: participantesRecIds,
        responsavelId: responsavelRecId,
        observacoes
      };

      await TurnosService.criarTurno(turnoData);
      alert("Turno criado com sucesso!");
      fecharModal();
      loadTurnos();
    } catch (error) {
      console.error("Erro ao criar turno:", error);
      alert("Erro ao criar turno. Verifique a consola.");
    } finally {
      setIsLoading(false);
    }
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

  const fecharModal = () => {
    setIsModalOpen(false);
    setUsarDataEspecifica(false);
    setDataEspecifica("");
    setDiaSemana(""); setHoraInicio(""); setHoraFim("");
    setEventoSelecionado(""); setParticipantesSelecionadosIds([]);
    setResponsavelSelecionadoId(""); setObservacoes("");
  };

  const renderAvailabilityBadge = (percentage: number, matched: number, total: number) => {
    if (total === 0) return null;
    if (percentage === 100) return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-green-100 text-green-700 border border-green-200">Disponível</span>;
    if (percentage === 0) return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-red-100 text-red-600 border border-red-200">Indisponível</span>;
    return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-yellow-100 text-yellow-700 border border-yellow-200">Parcial ({matched}/{total})</span>;
  };

  const TurnosTable = ({ turnos: turnosList, isHistorical }: { turnos: TurnoLocal[], isHistorical: boolean }) => (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden min-h-[300px]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horário</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responsável</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Participantes</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {turnosList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {isLoading ? "A carregar turnos..." : `Nenhum turno ${isHistorical ? 'histórico' : 'ativo'} encontrado.`}
                </td>
              </tr>
            ) : (
              turnosList.map((turno) => (
                <tr key={turno.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{turno.dataCompleta}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{turno.horaInicio} - {turno.horaFim}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{getNomeEvento(turno.eventoId)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">{getNomeParticipanteParaTabela(turno.responsavelId)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{turno.participantesIds.map(id => getNomeParticipanteParaTabela(id)).join(", ")}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => apagarTurno(turno.id!)} 
                      className={`hover:underline ${isHistorical ? 'text-orange-600' : 'text-red-600'}`}
                    >
                      Apagar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <ProtectedPage>
      <main className="min-h-screen flex flex-col pt-20 px-4 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl text-white font-semibold">Gestão de Turnos</h1>
        </div>

        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={() => loadTurnos()} 
            disabled={isLoading} 
            className="bg-white hover:bg-gray-100 text-black px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span className={isLoading ? "animate-spin" : ""}>↻</span>
            {isLoading ? "A carregar..." : "Refrescar"}
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition">
            + Criar Turno
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("active")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === "active"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                }`}
              >
                Turnos Ativos
                <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {turnosAtivos.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("historical")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === "historical"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                }`}
              >
                Turnos Históricos
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {turnosHistoricos.length}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Active Turnos Tab */}
        {activeTab === "active" && (
          <>
            {/* Filters for Active Turnos */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg text-black font-medium mb-4">Filtros</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Evento
                  </label>
                  <input
                    type="text"
                    value={filterNomeAtivo}
                    onChange={e => setFilterNomeAtivo(e.target.value)}
                    placeholder="Filtrar por evento..."
                    className="w-full px-4 py-2 border text-gray-500 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pessoa</label>
                  <input
                    type="text"
                    value={filterParticipanteAtivo}
                    onChange={e => setFilterParticipanteAtivo(e.target.value)}
                    placeholder="Filtrar por participante..."
                    className="w-full px-4 py-2 border text-gray-500 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <TurnosTable turnos={filteredTurnosAtivos} isHistorical={false} />
          </>
        )}

        {/* Historical Turnos Tab */}
        {activeTab === "historical" && (
          <>
            {/* Filters for Historical Turnos */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg text-black font-medium mb-4">Filtros</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Evento
                  </label>
                  <input
                    type="text"
                    value={filterNomeHistorico}
                    onChange={e => setFilterNomeHistorico(e.target.value)}
                    placeholder="Filtrar por evento..."
                    className="w-full px-4 py-2 border text-gray-500 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pessoa</label>
                  <input
                    type="text"
                    value={filterParticipanteHistorico}
                    onChange={e => setFilterParticipanteHistorico(e.target.value)}
                    placeholder="Filtrar por participante..."
                    className="w-full px-4 py-2 border text-gray-500 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <TurnosTable turnos={filteredTurnosHistoricos} isHistorical={true} />
          </>
        )}

        {/* MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl text-gray-900 font-bold">Criar Novo Turno</h2>
                <button onClick={fecharModal} className="text-gray-500 hover:text-gray-800 text-xl font-bold px-2">X</button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5">
                
                {/* 1. Evento */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Evento Associado *</label>
                  <select
                    value={eventoSelecionado}
                    onChange={e => setEventoSelecionado(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  >
                    <option value="">Selecione o evento...</option>
                    {eventos.map(ev => (<option key={ev.id} value={ev.id}>{ev.nome}</option>))}
                  </select>
                </div>

                {/* 2. Data */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="usarDataEspecifica"
                      checked={usarDataEspecifica}
                      onChange={e => setUsarDataEspecifica(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="usarDataEspecifica" className="text-sm font-medium text-gray-700">Usar data específica</label>
                  </div>

                  {usarDataEspecifica ? (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Data Específica *</label>
                      <input
                        type="date"
                        value={dataEspecifica.split('/').reverse().join('-')} 
                        onChange={e => {
                          const [year, month, day] = e.target.value.split('-');
                          setDataEspecifica(`${day}/${month}/${year}`);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Dia da Semana *</label>
                      <select
                        value={diaSemana}
                        onChange={e => setDiaSemana(e.target.value === "" ? "" : parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      >
                        <option value="">Selecione...</option>
                        {DIAS_SEMANA.map(dia => (<option key={dia.value} value={dia.value}>{dia.label}</option>))}
                      </select>
                      {!usarDataEspecifica && diaSemana !== "" && (
                        <p className="text-xs text-gray-500 mt-1">Próxima data: {getNextDateForWeekday(diaSemana as number)}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Horários */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Início *</label>
                    <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} step="1800" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Fim *</label>
                    <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} step="1800" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900" />
                  </div>
                </div>

                {/* Info */}
                {horaInicio && horaFim && ((usarDataEspecifica && dataEspecifica) || (!usarDataEspecifica && diaSemana !== "")) && (
                  <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                    <p className="text-xs text-blue-700">
                      📅 <strong>{usarDataEspecifica ? dataEspecifica : `${getNomeDiaSemana(diaSemana as number)} (${getNextDateForWeekday(diaSemana as number)})`}</strong> das <strong>{horaInicio}</strong> às <strong>{horaFim}</strong>
                    </p>
                  </div>
                )}

                {/* 4. Participantes */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-semibold text-gray-700">Membros *</label>
                    {isLoadingParticipantes && <span className="text-xs text-blue-600 animate-pulse">A atualizar...</span>}
                  </div>
                  <div className="border border-gray-200 rounded-md max-h-64 overflow-y-auto p-0 bg-gray-50">
                    {isLoadingParticipantes && participantesDisponiveis.length === 0 ? (
                       <p className="text-xs text-gray-500 p-4">A carregar dados...</p>
                    ) : participantesDisponiveis.length > 0 ? (
                      participantesDisponiveis.map(pessoa => (
                        <label key={pessoa.istId} className={`flex items-center p-3 hover:bg-white cursor-pointer transition border-b border-gray-100 last:border-0 relative ${pessoa.matchPercentage === 0 && horaInicio ? 'bg-gray-100 opacity-60' : 'bg-white'}`}>
                          {horaInicio && horaFim && pessoa.matchPercentage > 0 && pessoa.matchPercentage < 100 && (
                             <div className="absolute left-0 top-0 bottom-0 bg-yellow-50 opacity-50 z-0" style={{ width: `${pessoa.matchPercentage}%` }} />
                          )}
                          <input type="checkbox" checked={participantesSelecionadosIds.includes(pessoa.istId)} onChange={() => toggleParticipante(pessoa.istId)} className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 z-10" />
                          <div className="ml-3 flex flex-col flex-1 z-10">
                            <div className="flex justify-between items-center w-full">
                              <span className={`text-sm font-medium ${pessoa.matchPercentage === 0 && horaInicio ? 'text-gray-500' : 'text-gray-900'}`}>{pessoa.nomeCompleto}</span>
                              {((usarDataEspecifica && dataEspecifica) || (!usarDataEspecifica && diaSemana !== "")) && horaInicio && horaFim && renderAvailabilityBadge(pessoa.matchPercentage, pessoa.matchedSlots, pessoa.totalSlotsRequired)}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2"><span className="text-[10px] text-gray-400">ID: {pessoa.istId}</span></div>
                          </div>
                        </label>
                      ))
                    ) : (
                      <div className="p-4 text-center"><p className="text-sm text-gray-500">Nenhum dado.</p></div>
                    )}
                  </div>
                </div>

                {/* 5. Responsável */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Responsável *</label>
                  <select
                    value={responsavelSelecionadoId}
                    onChange={e => setResponsavelSelecionadoId(e.target.value)}
                    disabled={participantesSelecionadosIds.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white disabled:bg-gray-100"
                  >
                    <option value="">{participantesSelecionadosIds.length === 0 ? "Selecione participantes..." : "Escolha o responsável..."}</option>
                    {participantesDisponiveis
                      .filter(p => participantesSelecionadosIds.includes(p.istId))
                      .map(p => (<option key={p.istId} value={p.istId}>{p.nomeReal}</option>))
                    }
                  </select>
                </div>

                {/* 6. Obs */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Observações</label>
                  <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900" placeholder="Notas..."/>
                </div>

              </div>
              
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                <button onClick={fecharModal} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-white text-sm">Cancelar</button>
                <button 
                  onClick={criarTurno} 
                  disabled={
                    (!usarDataEspecifica && diaSemana === "") || 
                    (usarDataEspecifica && !dataEspecifica) ||
                    !horaInicio || !horaFim || !eventoSelecionado || 
                    participantesSelecionadosIds.length === 0 || !responsavelSelecionadoId || isLoading
                  } 
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm shadow-sm"
                >
                  {isLoading ? "A guardar..." : "Criar Turno"}
                </button>
              </div>

            </div>
          </div>
        )}
      </main>
    </ProtectedPage>
  );
}

