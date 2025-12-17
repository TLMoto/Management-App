import Airtable from 'airtable';
import { record, z } from 'zod';

// Use the Airtable API key and base ID from environment variables
Airtable.configure({
  apiKey: 'patlMkQE4ALuklWbe.33941a853735ffefde5334f0b8aed4e447ab23362dcdb2e4cddb5a167937b827',
  endpointUrl: 'https://api.airtable.com',
});

const base = Airtable.base('appPg51nD6h3RpEK2');

const UserSchema = z.object({
  id: z.string(),
  nome: z.string().default('Sem Nome'),
  funcao: z.string().default('Sem Função'),
  department: z.string().default('Sem Departamento'),
  istId: z.number().or(z.string()).transform(Number),
});

export type User = z.infer<typeof UserSchema>;

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

      // Validate + normalize
      const parsed = UserSchema.safeParse(rawData);

      if (!parsed.success) {
        console.warn(
          '⚠️ Airtable user data validation failed. Issues:',
          parsed.error.message,
          '\nRaw data received:',
          rawData
        );
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

        if (!parsed.success) {
          console.error(`Validation failed for record ${record.id}:`, parsed.error);
          return [];
        }

        return parsed.data;
      });

      // Filter out invalid/null entries, then sort by `nome` ascending (locale-aware)
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
      const records = await base('Controlo de Presenças')
        .select({
          fields: ['Área'],
        })
        .all();

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

const EventoAtivoSchema = z.object({
  id: z.string(),
  nome: z.string().default('Sem Nome'),
  participantes: z.array(z.string()).default(['Sem Pessoas']),
  dataInicio: z.string().default('Sem Data'),
  dataFim: z.string().default('Sem Data'),
  turnosAtivos: z.array(z.string()).default(['Sem Turnos']),
});

export type EventoAtivo = z.infer<typeof EventoAtivoSchema>;

export const EventosAtivosService = {
  async getEventosAtivos(): Promise<EventoAtivo[] | null> {
    try {
      const records = await base('Eventos Ativos')
        .select({
          view: 'Grid view',
        })
        .all();

      console.log('Airtable Eventos Ativos records fetched:', records);

      const results = records.map(record => {
        const rawData = {
          id: record.id,
          nome: record.get('Nome'),
          participantes: record.get('Participantes'),
          dataInicio: record.get('Data Início'),
          dataFim: record.get('Data Fim'),
        };
        const result = EventoAtivoSchema.safeParse(rawData);

        if (!result.success) {
          console.error(`Validation failed for record ${record.id}:`, result.error);
          return null;
        }
        return result.data;
      });
      return results.filter((r): r is EventoAtivo => r !== null);
    } catch (error) {
      console.error('Error fetching eventos ativos:', error);
      return null;
    }
  },

  async criarEvento(evento: { nome: string; dataInicio: string; dataFim: string }): Promise<void> {
    try {
      await base('Eventos Ativos').create([
        {
          fields: {
            // eslint-disable-next-line prettier/prettier
            'Nome': evento.nome,
            'Data Início': evento.dataInicio,
            'Data Fim': evento.dataFim,
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating evento:', error);
      throw error;
    }
  },

  async apagarEvento(eventoId: string): Promise<void> {
    try {
      await base('Eventos Ativos').destroy([eventoId]);
    } catch (error) {
      console.error('Error deleting evento:', error);
      throw error;
    }
  },
};

const TurnoAtivoSchema = z.object({
  id: z.string(),
  idTurno: z.string().default('Sem ID Turno'),
  nome: z.array(z.string()).default(['Sem Nomes']),
  evento: z.string().default('Sem Evento'),
  dataInicio: z.string().default('Sem Data'),
  dataFim: z.string().default('Sem Data'),
});

export type TurnoAtivo = z.infer<typeof TurnoAtivoSchema>;

export const TurnosAtivosService = {
  async getTurnosAtivos(): Promise<TurnoAtivo[] | null> {
    try {
      const records = await base('Turnos Ativos')
        .select({
          view: 'Grid view',
        })
        .all();
      const results = records.map(record => {
        const rawEvento = record.get('Evento');
        const safeEvento = Array.isArray(rawEvento) && rawEvento.length > 0 ? rawEvento[0] : [];
        const rawNome = record.get('Nome');
        const safeNome = rawNome;
        const rawData = {
          id: record.id,
          idTurno: record.get('ID Turno')?.toString(),
          nome: safeNome,
          evento: safeEvento,
          dataInicio: record.get('Data Início'),
          dataFim: record.get('Data Fim'),
        };
        const result = TurnoAtivoSchema.safeParse(rawData);

        console.log('Turno Ativo Raw Data:', result);

        if (!result.success) {
          console.error(`Validation failed for record ${record.id}:`, result.error);
          return null;
        }
        return result.data;
      });
      return results.filter((r): r is TurnoAtivo => r !== null);
    } catch (error) {
      console.error('Error fetching turnos ativos:', error);
      return null;
    }
  },

  async getTurnosAtivosPorPessoa(recordID: string): Promise<TurnoAtivo[]> {
    try {
      const records = await base('Turnos Ativos')
        .select({
          view: 'Grid view',
          filterByFormula: `SEARCH('${recordID}', ARRAYJOIN({Nome}))`,
        })
        .all();

      console.log(`Airtable Turnos Ativos records fetched for pessoa ${recordID}:`, records);
      const results = records.map(record => {
        const rawEvento = record.get('Evento');
        const safeEvento = Array.isArray(rawEvento) ? rawEvento[0] : rawEvento;
        const rawData = {
          id: record.id,
          idTurno: record.get('ID Turno')?.toString(),
          nomes: record.get('Nome'),
          evento: safeEvento,
          dataInicio: record.get('Data Início'),
          dataFim: record.get('Data Fim'),
        };
        const result = TurnoAtivoSchema.safeParse(rawData);

        if (!result.success) {
          console.error(`Validation failed for record ${record.id}:`, result.error);
          return [];
        }
        return result.data;
      });
      return results.filter((r): r is TurnoAtivo => r !== null);
    } catch (error) {
      console.error('Error fetching turnos ativos:', error);
      throw [];
    }
  },
};
