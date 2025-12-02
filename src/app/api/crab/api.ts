const API_BASE_URL = '/api/crab';

export interface EventInput {
  name: string;
  times: string[];
  timezone: string;
}

export interface EventResponse {
  id: string;
  name: string;
  times: string[];
  timezone: string;
  created_at: number;
}

export interface PersonAvailabilityUpdate {
  availability: string[];
}

export interface PersonAvailabilityResponse {
  name: string;
  availability: string[];
  created_at: number;
}

export async function createEvent(eventData: EventInput): Promise<EventResponse> {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro HTTP ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Erro no proxy:', error);
    throw error;
  }
}

export async function getEvent(event_id: string): Promise<EventResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}?eventId=${event_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro HTTP ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
}

export async function updateAvailability(
  event_id: string,
  personName: string,
  availability: string[]
): Promise<PersonAvailabilityResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}?eventId=${encodeURIComponent(event_id)}&personName=${encodeURIComponent(personName)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ availability }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage =
        errorData.error || `Erro HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro desconhecido ao atualizar disponibilidade');
  }
}

export async function loginOrCreatePerson(
  event_id: string,
  personName: string
): Promise<PersonAvailabilityResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}?eventId=${encodeURIComponent(event_id)}&personName=${encodeURIComponent(personName)}&action=login`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro HTTP ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro desconhecido ao fazer login/criar pessoa');
  }
}
