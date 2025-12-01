import Airtable from 'airtable';
import { z } from 'zod';
import { ca } from 'zod/locales';

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

      if (!records || records.length === 0) return null;

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
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  },

  async getAllUsers(): Promise<User[] | null> {
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
          return null;
        }

        return parsed.data;
      });

      return users.filter((u): u is User => u !== null);
    } catch (error) {
      console.error('Error fetching all users:', error);
      return null;
    }

  },

  async getAllDepartamentos(): Promise<Set<String> | null> {
    try {
      const records = await base('Controlo de Presenças')
        .select({
          fields: ['Área'],

        }).all();

      const allValues = records.map(record => record.get('Área'));
      const flatValues = allValues.flat().filter(v => v !== undefined && v !== null);

      const stringSet = new Set(flatValues.map(item => String(item)));

      return stringSet;

    } catch (error) {
      console.error('Error fetching departamentos:', error);
      return null;
    }
  }
};

const EventoAtivoSchema = z.object({
  id: z.string(),
  idEvento: z.string().default('Sem ID Evento'),
  area: z.string().default('Sem Área'),
  pessoasIndividuais: z.array(z.string()).default(['Sem Pessoas']),
  dataInicio: z.string().default('Sem Data'),
  dataFim: z.string().default('Sem Data'),
  turnosAtivos: z.array(z.string()).default(['Sem Turnos']),
});

export type EventoAtivo = z.infer<typeof EventoAtivoSchema>;

export const EventosAtivosService = {
  async getEventosAtivos(): Promise<EventoAtivo[] | null> {
    try {
      const records = await base('Eventos Ativos').select({

      }).all()

      const results = records.map(record => {

        const rawArea = record.get('Area');
        const safeArea = Array.isArray(rawArea) ? rawArea[0] : rawArea;
        const rawData = {
          id: record.id,
          idEvento: record.get('ID Evento'),
          area: safeArea,
          pessoasIndividuais: record.get('Pessoa Individuais'),
          dataInicio: record.get('Data Início'),
          dataFim: record.get('Data Fim'),
          turnosAtivos: record.get('Turnos Ativos'),
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
  }

};

const TurnoAtivoSchema = z.object({
  id: z.string(),
  idTurno: z.string().default('Sem ID Turno'),
  nome: z.string().default('Sem Nome'),
  evento: z.string().default('Sem Evento'),
  istIds: z.string().default('Sem IST Id'),
  dataInicio: z.string().default('Sem Data'),
  dataFim: z.string().default('Sem Data'),
  area: z.string().default('Sem Área'),
});

export type TurnoAtivo = z.infer<typeof TurnoAtivoSchema>;

export const TurnosAtivosService = {
  async getTurnosAtivos(): Promise<TurnoAtivo[] | null> {
    try {
      const records = await base('Turnos Ativos').select({

      }).all();
      const results = records.map(record => {

        const rawEvento = record.get('Evento');
        const safeEvento = Array.isArray(rawEvento) ? rawEvento[0] : rawEvento;
        const rawNome = record.get('Nome');
        const safeNome = Array.isArray(rawNome) ? rawNome[0] : rawNome;
        const rawIst = record.get('IST ID (from Nome)');
        const safeIst = Array.isArray(rawIst) ? rawIst[0] : rawIst;
        const rawArea = record.get('Área (from Evento)');
        const safeArea = Array.isArray(rawArea) ? rawArea[0] : rawArea;
        const rawData = {
          id: record.id,
          idTurno: record.get('ID Turno')?.toString(),
          nome: safeNome,
          evento: safeEvento,
          istIds: safeIst.toString(),
          dataInicio: record.get('Data Início'),
          dataFim: record.get('Data Fim'),
          area: safeArea,
        };
        const result = TurnoAtivoSchema.safeParse(rawData);

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

  async getTurnosAtivosPorDepartamento(departamento: string): Promise<TurnoAtivo[] | null> {
    try {
      const records = await base('Turnos Ativos').select({
        filterByFormula: `{Área (from Nome)} = '${departamento}'`
      }).all();

      const results = records.map(record => {
        const rawEvento = record.get('Evento');
        const safeEvento = Array.isArray(rawEvento) ? rawEvento[0] : rawEvento;
        const rawNome = record.get('Nome');
        const safeNome = Array.isArray(rawNome) ? rawNome[0] : rawNome;
        const rawIst = record.get('IST ID (from Nome)');
        const safeIst = Array.isArray(rawIst) ? rawIst[0] : rawIst;
        const rawArea = record.get('Área (from Nome)');
        const safeArea = Array.isArray(rawArea) ? rawArea[0] : rawArea;
        const rawData = {
          id: record.id,
          idTurno: record.get('ID Turno')?.toString(),
          nome: safeNome,
          evento: safeEvento,
          istIds: safeIst.toString(),
          dataInicio: record.get('Data Início'),
          dataFim: record.get('Data Fim'),
          area: safeArea,
        };
        const result = TurnoAtivoSchema.safeParse(rawData);

        if (!result.success) {
          console.error(`Validation failed for record ${record.id}:`, result.error);
          return null;
        }
        return result.data;
      });
      return results.filter((r): r is TurnoAtivo => r !== null);
    } catch (error) {
      console.error('Error fetching turnos ativos by departamento:', error);
      return null;
    }
  },

  async getTurnosAtivosPorPessoa(istId: number): Promise<TurnoAtivo[] | null> {
    try {
      const searchId = String(istId);
      const records = await base('Turnos Ativos').select({
        filterByFormula: `SEARCH('${searchId}', {IST ID (from Nome)} & "") > 0`
      }).all();
      const results = records.map(record => {

        const rawEvento = record.get('Evento');
        const safeEvento = Array.isArray(rawEvento) ? rawEvento[0] : rawEvento;
        const rawIst = record.get('IST ID (from Nome)');
        const safeIst = Array.isArray(rawIst) ? rawIst[0] : rawIst;
        const rawData = {
          id: record.id,
          idTurno: record.get('ID Turno')?.toString(),
          nomes: record.get('Nomes'),
          evento: safeEvento,
          istIds: safeIst.toString(),
        };
        const result = TurnoAtivoSchema.safeParse(rawData);

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
  }


};






