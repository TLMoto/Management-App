import Airtable from 'airtable';
import { z } from 'zod';

// Use the Airtable API key and base ID from environment variables
Airtable.configure({
  apiKey: 'patLgtP8UHns0Kr0D.9c48a3f5af797518a9e1f5f955765852e91ee05635cb72370d2f2c4584cd2cc6',
  endpointUrl: 'https://api.airtable.com',
});

const base = Airtable.base('app9EghZV4Smh0lFi');


const UserSchema = z.object({
  id: z.string(),
  nome: z.string().default('Sem Nome'),
  funcao: z.array(z.string()).default(['Sem Função']),
  department: z.string().default('Sem Departamento'),
  istId: z.number().or(z.string()).transform(Number),
});

export type User = z.infer<typeof UserSchema>;

export const UserService = {
  async getUser(userId: number): Promise<User | null> {
    try {
      const records = await base('Team')
        .select({
          maxRecords: 1,
          view: 'Grid view',
          filterByFormula: `{IST ID} = ${userId}`,
        })
        .firstPage();

      if (!records || records.length === 0) return null;

      const record = records[0];

      const rawData = {
        id: record.id,
        nome: record.get('Nome e Sobrenome'),
        funcao: record.get('Função'),
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

  async getAllDepartments(): Promise<string[]> {
    try {
      const records = await base('Team')
        .select({
          view: 'Grid view',
        })
        .all();

      const departmentsSet = new Set<string>();

      records.forEach((record) => {
        const department = record.get('Área');
        if (typeof department === 'string' && department.trim() !== '') {
          departmentsSet.add(department);
        }
      });

      return Array.from(departmentsSet).sort();
    } catch (error) {
      console.error('Error fetching departments:', error);
      return [];
    }
  },

  async getAllUsers(): Promise<User[]> {
    try {
      const records = await base('Team')
        .select({
          view: 'Grid view',
          sort: [{ field: 'Nome e Sobrenome', direction: 'asc' }],
        })
        .all();

      const users: User[] = [];

      records.forEach((record) => {
        const rawData = {
          id: record.id,
          nome: record.get('Nome e Sobrenome'),
          funcao: record.get('Função'),
          department: record.get('Área'),
          istId: record.get('IST ID'),
        };

        // Validate + normalize
        const parsed = UserSchema.safeParse(rawData);

        if (parsed.success) {
          users.push(parsed.data);
        } else {
          console.warn(
            '⚠️ Airtable user data validation failed. Issues:',
            parsed.error.message,
            '\nRaw data received:',
            rawData
          );
        }
      });

      return users;
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  },
};

