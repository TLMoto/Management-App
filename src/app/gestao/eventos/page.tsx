"use client";
import ProtectedPage from "@/src/components/ProtectedPage";
import React, { JSX, useEffect, useState } from "react";
import { EventosAtivosService } from "../../api/airtable/airtable";
import { useMembers } from "@/src/components/MemberProvider";
import { Evento, EventoPorCriar } from "@/src/components/Interfaces";
import { useUser } from "@/src/components/UserProvider";

export default function Eventos(): JSX.Element {
  const { members } = useMembers();
  const [nome, setNome] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { isLider } = useUser();

  // Filter states
  const [filterNome, setFilterNome] = useState("");
  const [filterParticipante, setFilterParticipante] = useState("");

  useEffect(() => {
    loadEventos();
  }, []);

  const loadEventos = () => {
    setIsLoading(true);
    EventosAtivosService.getEventosAtivos()
      .then(eventos => {
        setEventos(eventos || []);
      })
      .catch(error => {
        console.error("Erro ao carregar eventos:", error);
        alert("Falha ao carregar eventos. Tente novamente.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const criarEvento = () => {
    const evento: EventoPorCriar = {
      nome,
      dataInicio,
      dataFim,
    };
    EventosAtivosService.criarEvento(evento)
      .then(() => {
        alert("Evento criado com sucesso!");
        setNome("");
        setDataInicio("");
        setDataFim("");
        setIsModalOpen(false);
        loadEventos();
      })
      .catch(error => {
        console.error("Erro ao criar evento:", error);
        alert("Falha ao criar evento. Tente novamente.");
      });
  };

  const apagarEvento = (idEvento: string) => {
    if (window.confirm("Tem certeza que deseja excluir este evento?")) {
      EventosAtivosService.apagarEvento(idEvento)
        .then(() => {
          alert("Evento excluído com sucesso!");
          loadEventos();
        })
        .catch((error: Error) => {
          console.error("Erro ao excluir evento:", error);
          alert("Falha ao excluir evento. Tente novamente.");
        });
    }
  };

  const obterNomeParticipantes = (participantIds: string[]): string[] => {
    if (!members || members.length === 0) return Array.from(new Set(participantIds));

    const uniqueIds = Array.from(new Set(participantIds));

    return uniqueIds.map(id => {
      const member = members.find(m => m.id === id);
      return member ? member.nome : id;
    });
  };

  const filteredEventos = eventos.filter(evento => {
    const matchesNome =
      filterNome === "" || evento.nome.toLowerCase().includes(filterNome.toLowerCase());
    const participantNames = obterNomeParticipantes(evento.participantes);
    const matchesParticipante =
      filterParticipante === "" ||
      participantNames.some(name => name.toLowerCase().includes(filterParticipante.toLowerCase()));
    return matchesNome && matchesParticipante;
  });

  return (
    <ProtectedPage>
      <main className="min-h-screen flex flex-col pt-20 px-4 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl text-white font-semibold">Gestão de Eventos</h1>
        </div>
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => loadEventos()}
            disabled={isLoading}
            className="bg-white hover:bg-gray-100 text-black px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span className={isLoading ? "animate-spin" : ""}>↻</span>
            {isLoading ? "A carregar..." : "Refrescar"}
          </button>
          {isLider && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition"
            >
              + Criar Evento
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg text-black font-medium mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Evento</label>
              <input
                type="text"
                value={filterNome}
                onChange={e => setFilterNome(e.target.value)}
                placeholder="Filtrar por nome..."
                className="w-full px-4 py-2 border text-gray-500 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pessoa</label>
              <input
                type="text"
                value={filterParticipante}
                onChange={e => setFilterParticipante(e.target.value)}
                placeholder="Filtrar por participante..."
                className="w-full px-4 py-2 border text-gray-500 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participantes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Início
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Fim
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEventos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Nenhum evento encontrado
                    </td>
                  </tr>
                ) : (
                  filteredEventos.map(evento => (
                    <tr key={evento.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {evento.nome}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {obterNomeParticipantes(evento.participantes).join(", ")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(evento.dataInicio).toLocaleDateString("pt-PT")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(evento.dataFim).toLocaleDateString("pt-PT")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => apagarEvento(evento.id)}
                          className="text-red-600 hover:text-red-900 transition"
                          title="Excluir evento"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Event Modal */}
        {isLider && isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl text-black font-semibold">Criar Novo Evento</h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Evento *
                    </label>
                    <input
                      type="text"
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      className="w-full px-4 py-2 text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Digite o nome do evento"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data de Início *
                      </label>
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={e => setDataInicio(e.target.value)}
                        className="w-full px-4 py-2 text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data de Fim *
                      </label>
                      <input
                        type="date"
                        value={dataFim}
                        onChange={e => setDataFim(e.target.value)}
                        className="w-full px-4 py-2 text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={criarEvento}
                    disabled={!nome || !dataInicio || !dataFim}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
                  >
                    Criar Evento
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </ProtectedPage>
  );
}
