import Airtable from 'airtable';
import {
  UserSchema,
  User,
  EventoSchema,
  Evento,
  TurnoSchema,
  Turno,
} from '@/src/components/Interfaces';


Airtable.configure({
  apiKey: 'patlMkQE4ALuklWbe.33941a853735ffefde5334f0b8aed4e447ab23362dcdb2e4cddb5a167937b827',
  endpointUrl: 'https://api.airtable.com',
});

const base = Airtable.base('appPg51nD6h3RpEK2');

export interface TurnoAirtable {
  id?: string;
  nome: string;
  data: string;       
  horaInicio: string; 
  horaFim: string;   
  eventoId: string;
  participantesIds: string[];
  responsavelId: string;
  observacoes?: string;
  tipo?: "Turno" | "Worksession" | "Reunião";
  isRecurring?: boolean;
  dataLimiteRecorrencia?: string;
}


const extractDateFromISO = (isoString: string): string => {
  if (!isoString) return "";
  const dateObj = new Date(isoString);
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
};


const extractTimeFromISO = (isoString: string): string => {
  if (!isoString) return "";
  const dateObj = new Date(isoString);
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};


const combineDateAndTimeToISO = (dateApp: string, timeApp: string): string => {
  if (!dateApp || !timeApp) return "";
  const [day, month, year] = dateApp.split('/').map(Number);
  const [hours, minutes] = timeApp.split(':').map(Number);
  const dateObj = new Date(year, month - 1, day, hours, minutes);
  return dateObj.toISOString();
};



export const ControloPresencasService = {
  async getUserByIstId(istId: number): Promise<User | null> {
    try {
      const records = await base('Controlo de Presenças')
        .select({
          maxRecords: 1,
          view: 'Grid view',
          filterByFormula: `{IST ID} = ${istId}`,
        })
        .firstPage();

      if (!records || records.length === 0) throw new Error('No user found with the given IST ID');

      const record = records[0];
      const rawFuncao = record.get('Função');
      const safeFuncao = Array.isArray(rawFuncao) ? rawFuncao[0] : rawFuncao;

      const rawData = {
        id: record.id,
        nome: record.get('Nome e Sobrenome'),
        funcao: safeFuncao,
        department: record.get('Área'),
        istId: record.get('IST ID'),
      };

      const parsed = UserSchema.safeParse(rawData);

      if (!parsed.success) {
        console.warn('⚠️ Airtable user data validation failed.', parsed.error.message);
        throw new Error('Airtable user data validation failed');
      }

      return parsed.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  },

  async getAllUsers(): Promise<User[]> {
    try {
      const records = await base('Controlo de Presenças').select({}).all();
      const users = records.map(record => {
        const rawFuncao = record.get('Função');
        const safeFuncao = Array.isArray(rawFuncao) ? rawFuncao[0] : rawFuncao;

        const rawData = {
          id: record.id,
          nome: record.get('Nome e Sobrenome'),
          funcao: safeFuncao,
          department: record.get('Área'),
          istId: record.get('IST ID'),
        };

        const parsed = UserSchema.safeParse(rawData);
        if (!parsed.success) return [];
        return parsed.data;
      });

      const validUsers = users.filter((u): u is User => u !== null);
      validUsers.sort((a, b) => a.nome.localeCompare(b.nome, 'pt', { sensitivity: 'base' }));
      return validUsers;
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  },

  async getAllDepartments(): Promise<string[]> {
    try {
      const records = await base('Controlo de Presenças').select({ fields: ['Área'] }).all();
      const allValues = records.map(record => record.get('Área'));
      const flatValues = allValues.flat().filter(v => v !== undefined && v !== null);
      const stringSet = new Set(flatValues.map(item => String(item)));
      return Array.from(stringSet);
    } catch (error) {
      console.error('Error fetching departamentos:', error);
      return [];
    }
  },
};

export const EventosService = {
  async getEventos(): Promise<Evento[] | null> {
    try {
      const records = await base('Eventos').select({ view: 'Eventos' }).all();
      const results = records.map(record => {
        const rawData = {
          id: record.id,
          nome: record.get('Nome'),
          participantes: record.get('Participantes'),
          dataInicio: record.get('Data Início'),
          dataFim: record.get('Data Fim'),
          turnos: record.get('Turnos'),
        };
        const result = EventoSchema.safeParse(rawData);
        if (!result.success) throw new Error(`Validation failed for record ${record.id}`);
        return result.data;
      });
      return results.filter((r): r is Evento => r !== null);
    } catch (error) {
      console.error('Error fetching eventos:', error);
      return [];
    }
  },

  async getHistoricoEventos(): Promise<Evento[]> {
    try {
      const records = await base('Eventos').select({ view: 'Histórico Eventos' }).all();
      const results = records.map(record => {
        const rawData = {
          id: record.id,
          nome: record.get('Nome'),
          participantes: record.get('Participantes'),
          dataInicio: record.get('Data Início'),
          dataFim: record.get('Data Fim'),
          turnos: record.get('Turnos'),
        };
        const result = EventoSchema.safeParse(rawData);
        if (!result.success) throw new Error(`Validation failed`);
        return result.data;
      });
      return results.filter((r): r is Evento => r !== null);
    } catch (error) {
      console.error('Error fetching historico eventos:', error);
      return [];
    }
  },

  async getEventosAtivos(): Promise<Evento[]> {
    try {
      const records = await base('Eventos').select({ view: 'Eventos Ativos' }).all();
      const results = records.map(record => {
        const rawData = {
          id: record.id,
          nome: record.get('Nome'),
          participantes: record.get('Participantes'),
          dataInicio: record.get('Data Início'),
          dataFim: record.get('Data Fim'),
        };
        const result = EventoSchema.safeParse(rawData);
        if (!result.success) return [];
        return result.data;
      });
      return results.filter((r): r is Evento => r !== null);
    } catch (error) {
      console.error('Error fetching eventos ativos:', error);
      return [];
    }
  },

  async criarEvento(evento: { nome: string; dataInicio: string; dataFim: string }): Promise<void> {
    try {
      await base('Eventos').create([{
        fields: {
          'Nome': evento.nome,
          'Data Início': evento.dataInicio,
          'Data Fim': evento.dataFim,
        },
      }]);
    } catch (error) {
      console.error('Error creating evento:', error);
      throw error;
    }
  },

  async apagarEvento(eventoId: string): Promise<void> {
    try {
      await base('Eventos').destroy([eventoId]);
    } catch (error) {
      console.error('Error deleting evento:', error);
      throw error;
    }
  },
};

export const TurnosService = {
 

  async getTurnosAtivos(): Promise<Turno[]> {
    try {
      const records = await base('Turnos').select({ view: 'Turnos Ativos' }).all();
      const results = records.map(record => {
        const rawEvento = record.get('Evento');
        const safeEvento = Array.isArray(rawEvento) && rawEvento.length > 0 ? rawEvento[0] : [];
        const rawParticipantes = record.get('Participantes');
        
        const rawData = {
          id: record.id,
          idTurno: record.get('ID Turno')?.toString(),
          participantes: rawParticipantes,
          evento: safeEvento,
          dataInicio: record.get('Data Início'),
          dataFim: record.get('Data Fim'),
        };
        const result = TurnoSchema.safeParse(rawData);
        if (!result.success) throw new Error(`Validation failed`);
        return result.data;
      });
      return results.filter((r): r is Turno => r !== null);
    } catch (error) {
      console.error('Error fetching turnos ativos:', error);
      return [];
    }
  },

  async getHistoricoTurnos(): Promise<Turno[]> {
    try {
      const records = await base('Turnos').select({ view: 'Histórico Turnos' }).all();
      const results = records.map(record => {
        const rawEvento = record.get('Evento');
        const safeEvento = Array.isArray(rawEvento) && rawEvento.length > 0 ? rawEvento[0] : [];
        const rawParticipantes = record.get('Participantes');
        
        const rawData = {
          id: record.id,
          idTurno: record.get('ID Turno')?.toString(),
          participantes: rawParticipantes,
          evento: safeEvento,
          dataInicio: record.get('Data Início'),
          dataFim: record.get('Data Fim'),
        };
        const result = TurnoSchema.safeParse(rawData);
        if (!result.success) throw new Error(`Validation failed`);
        return result.data;
      });
      return results.filter((r): r is Turno => r !== null);
    } catch (error) {
      console.error('Error fetching historico turnos:', error);
      return [];
    }
  },

  async getTurnosAtivosPorPessoa(recordID: string): Promise<Turno[]> {
    try {
      const allRecords = await base('Turnos').select({ view: 'Turnos Ativos' }).all();
      const filteredRecords = allRecords.filter(record => {
        const participantes = record.get('Participantes');
        return Array.isArray(participantes) && participantes.includes(recordID);
      });

      const results = filteredRecords.map(record => {
        const rawEvento = record.get('Evento');
        const safeEvento = Array.isArray(rawEvento) && rawEvento.length > 0 ? rawEvento[0] : 'Sem Evento';
        const rawData = {
          id: record.id,
          idTurno: record.get('ID Turno')?.toString() || 'Sem ID Turno',
          participantes: record.get('Participantes'),
          evento: safeEvento,
          dataInicio: record.get('Data Início'),
          dataFim: record.get('Data Fim'),
        };
        const result = TurnoSchema.safeParse(rawData);
        if (!result.success) return [];
        return result.data;
      });
      return results.filter((r): r is Turno => r !== null);
    } catch (error) {
      console.error('Error fetching turnos por pessoa:', error);
      return [];
    }
  },


 
  async getTurnos(): Promise<TurnoAirtable[]> {
    try {
      const records = await base('Turnos').select({
        sort: [{ field: 'Data Início', direction: 'desc' }]
      }).all();

      return records.map(record => {
        
        const eventoArr = record.get('Evento') as string[] | undefined;
        const participantesArr = record.get('Participantes') as string[] | undefined;
        const responsavelArr = record.get('Responsável') as string[] | undefined;
        
        
        const startISO = record.get('Data Início') as string; 
        const endISO = record.get('Data Fim') as string;

        return {
          id: record.id,
          nome: record.get('Nome') as string || "",
         
          data: extractDateFromISO(startISO),     
          horaInicio: extractTimeFromISO(startISO), 
          horaFim: extractTimeFromISO(endISO),      
          
          eventoId: eventoArr && eventoArr.length > 0 ? eventoArr[0] : "",
          participantesIds: participantesArr || [],
          responsavelId: responsavelArr && responsavelArr.length > 0 ? responsavelArr[0] : "",
          observacoes: record.get('Observações') as string || "",
          tipo: record.get('Tipo') as any,
          isRecurring: record.get('Recorrente') as boolean,
          dataLimiteRecorrencia: record.get('Data Limite Recorrência') as string,


        };
      });
    } catch (error) {
      console.error("Erro ao buscar turnos (Gestão):", error);
      return [];
    }
  },

  
  async criarTurno(payload: Omit<TurnoAirtable, 'id'>): Promise<string> {
    try {
      
      const dataInicioISO = combineDateAndTimeToISO(payload.data, payload.horaInicio);
      const dataFimISO = combineDateAndTimeToISO(payload.data, payload.horaFim);

      const fields: any = {
        'Nome': payload.nome,
        'Data Início': dataInicioISO, 
        'Data Fim': dataFimISO,
        'Evento': [payload.eventoId],
        'Participantes': payload.participantesIds,
        'Observações': payload.observacoes || '',
        'Tipo': payload.tipo,
        'Recorrente': payload.isRecurring,
        'Data Limite Recorrência': payload.dataLimiteRecorrencia
      };

      
      if (payload.responsavelId) {
        fields['Responsável'] = [payload.responsavelId];
      }

      const records = await base('Turnos').create([{ fields }]);

      if (!records || records.length === 0) throw new Error("Falha ao criar registo.");
      return records[0].id;
    } catch (error) {
      console.error('Erro ao criar turno (Gestão):', error);
      throw error;
    }
  },

  async editarTurno(idTurno: string, payload: Omit<TurnoAirtable, 'id'>): Promise<void> {
    try {
      const dataInicioISO = combineDateAndTimeToISO(payload.data, payload.horaInicio);
      const dataFimISO = combineDateAndTimeToISO(payload.data, payload.horaFim);

      const fields: any = {
        'Nome': payload.nome,
        'Data Início': dataInicioISO,
        'Data Fim': dataFimISO,
        'Evento': [payload.eventoId],
        'Participantes': payload.participantesIds,
        'Observações': payload.observacoes || '',
        'Tipo': payload.tipo,
        'Recorrente': payload.isRecurring,
        'Data Limite Recorrência': payload.dataLimiteRecorrencia
      };

      if (payload.responsavelId) {
        fields['Responsável'] = [payload.responsavelId];
      }

      await base('Turnos').update([{ id: idTurno, fields }]);
    } catch (error) {
      console.error('Erro ao editar turno (Gestão):', error);
      throw error;
    }
  },    

  
  async apagarTurno(idTurno: string): Promise<void> {
    try {
      await base('Turnos').destroy([idTurno]);
    } catch (error) {
      console.error('Erro ao apagar turno (Gestão):', error);
      throw error;
    }
  }

};