"use client";
import ProtectedPage from "@/src/components/ProtectedPage";
import React, { JSX, useState, useMemo } from "react";
import { useMembers, useMembersByAreaArray } from "@/src/components/MemberProvider";
import { User } from "@/src/components/Interfaces";

export default function Membros(): JSX.Element {
  const { members } = useMembers();
  const membersByAreaArray = useMembersByAreaArray();

  // Filter states
  const [filterNome, setFilterNome] = useState("");
  const [filterFuncao, setFilterFuncao] = useState("");
  const [selectedArea, setSelectedArea] = useState<string>("all");

  // Helper function to normalize text (remove accents)
  const normalizeSearch = (text: string): string => {
    return text
      .trim()
      .replace(/\s+/g, " ")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  };

  // Filter members and group by area
  const filteredData = useMemo(() => {
    const filtered = members.filter(member => {
      const normalizedFilterNome = normalizeSearch(filterNome);
      const normalizedFilterFuncao = normalizeSearch(filterFuncao);
      const matchesNome =
        normalizedFilterNome === "" || normalizeSearch(member.nome).includes(normalizedFilterNome);
      const matchesFuncao =
        normalizedFilterFuncao === "" ||
        normalizeSearch(member.funcao).includes(normalizedFilterFuncao);
      const matchesArea = selectedArea === "all" || member.department === selectedArea;
      return matchesNome && matchesFuncao && matchesArea;
    });

    // Group filtered members by area (already sorted by area and name)
    const grouped = filtered.reduce(
      (acc, member) => {
        const area = member.department || "Sem Departamento";
        if (!acc[area]) {
          acc[area] = [];
        }
        acc[area].push(member);
        return acc;
      },
      {} as Record<string, User[]>
    );

    return Object.keys(grouped)
      .sort()
      .map(area => ({
        area,
        users: grouped[area],
      }));
  }, [members, filterNome, filterFuncao, selectedArea]);

  const filteredMembersCount = filteredData.reduce((sum, group) => sum + group.users.length, 0);

  return (
    <ProtectedPage>
      <main className="min-h-screen flex flex-col pt-20 px-4 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl text-white font-semibold">Membros da Equipa</h1>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div className="text-white">
            <span className="text-lg font-medium">Total: {filteredMembersCount} membros</span>
            {selectedArea !== "all" && (
              <span className="ml-4 text-sm text-gray-300">em {selectedArea}</span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
          <h2 className="text-base sm:text-lg text-black font-medium mb-3 sm:mb-4">Filtros</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
              <input
                type="text"
                value={filterNome}
                onChange={e => setFilterNome(e.target.value)}
                placeholder="Filtrar por nome..."
                className="w-full px-4 py-2 border text-gray-500 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Função</label>
              <input
                type="text"
                value={filterFuncao}
                onChange={e => setFilterFuncao(e.target.value)}
                placeholder="Filtrar por função..."
                className="w-full px-4 py-2 border text-gray-500 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Área</label>
              <select
                value={selectedArea}
                onChange={e => setSelectedArea(e.target.value)}
                className="w-full px-4 py-2 border text-gray-500 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todas as Áreas</option>
                {membersByAreaArray.map(({ area }) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Members List by Area */}
        <div className="space-y-6">
          {filteredData.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500">Nenhum membro encontrado</p>
            </div>
          ) : (
            filteredData.map(({ area, users }) => (
              <div key={area} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {area}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({users.length} {users.length === 1 ? "membro" : "membros"})
                    </span>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider md:w-2/5">
                          Nome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider md:w-2/5">
                          Função
                        </th>
                        <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider md:w-1/5">
                          IST ID
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map(member => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                {member.nome
                                  .split(" ")
                                  .map(n => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {member.nome}
                                </div>
                                <div className="text-xs text-gray-500 md:hidden mt-1">
                                  {member.istId}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{member.funcao}</td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {member.istId}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </ProtectedPage>
  );
}
