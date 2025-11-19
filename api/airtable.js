import Airtable from "airtable";

// Use the Airtable API key and base ID from environment variables
Airtable.configure({
  apiKey: "patLgtP8UHns0Kr0D.9c48a3f5af797518a9e1f5f955765852e91ee05635cb72370d2f2c4584cd2cc6", // use env var (safe for Expo public usage)
  endpointUrl: "https://api.airtable.com",
});

const base = Airtable.base("app9EghZV4Smh0lFi"); // your base ID

export const UserService = {
  async getUser(userId){
    return new Promise((resolve, reject) => {
      try {
        base("Team").select({
          maxRecords: 1,
          view: "Grid view",
          filterByFormula: `{IST ID} = '${userId}'`,
        })
        .firstPage((err, records) => {
          if (err) {
            console.error(err);
            reject(err);
            return;
          }
          
          if (!records || records.length === 0) {
            resolve(null);
            return;
          }
          
          const record = records[0];
          const user = {
            id: record.id,
            nome: record.get("Nome e Sobrenome"),
            funcao: record.get("Função"),
            department: record.get("Área"),
            istId: record.get("IST ID"),
          };
          
          resolve(user);
        });
      } catch (error) {
        console.error(error);
        reject(error);
      }
    });
  }
};