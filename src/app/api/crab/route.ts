import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://api.crab.fit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `API Error: ${errorText}` }, { status: response.status });
    }

    const result = await response.json();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Proxy: Erro interno:', error);
    return NextResponse.json({ error: 'Erro interno do proxy' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const personName = searchParams.get('personName');
    const action = searchParams.get('action');

    // Operação: Login/Criar pessoa
    if (action === 'login' && eventId && personName) {
      const response = await fetch(
        `${API_BASE_URL}/event/${encodeURIComponent(eventId)}/people/${encodeURIComponent(personName)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();

        let errorMessage = 'Erro desconhecido da API';

        switch (response.status) {
          case 401:
            errorMessage = 'Senha incorreta';
            break;
          case 404:
            errorMessage = 'Evento não encontrado';
            break;
          case 415:
            errorMessage = 'Formato de entrada não suportado';
            break;
          case 422:
            errorMessage = 'Dados de entrada inválidos';
            break;
          case 429:
            errorMessage = 'Muitas requisições - tenta novamente mais tarde';
            break;
          default:
            errorMessage = `Erro da API: ${errorText}`;
        }

        return NextResponse.json({ error: errorMessage }, { status: response.status });
      }

      const result = await response.json();
      return NextResponse.json(result);
    }

    if (action === 'getPeople' && eventId) {
      const response = await fetch(`${API_BASE_URL}/event/${eventId}/people`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();

        let errorMessage = 'Erro desconhecido da API';

        switch (response.status) {
          case 404:
            errorMessage = 'Event not found';
            break;
          case 429:
            errorMessage = 'Too many requests';
            break;
          default:
            errorMessage = `Erro da API: ${errorText}`;
        }

        return NextResponse.json({ error: errorMessage }, { status: response.status });
      }
      const result = await response.json();
      return NextResponse.json(result);
    }

    // Operação: Buscar evento
    if (eventId && !action) {
      const response = await fetch(`${API_BASE_URL}/event/${eventId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ error: `API Error: ${errorText}` }, { status: response.status });
      }

      const result = await response.json();
      return NextResponse.json(result);
    }

    return NextResponse.json(
      {
        error:
          'Parâmetros inválidos. Use ?id=eventId para buscar evento ou ?eventId=X&personName=Y&action=login para login',
      },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do proxy' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const personName = searchParams.get('personName');

    if (!eventId) {
      return NextResponse.json({ error: 'ID do evento é obrigatório' }, { status: 400 });
    }

    if (!personName) {
      return NextResponse.json({ error: 'Nome da pessoa é obrigatório' }, { status: 400 });
    }

    if (!body.availability || !Array.isArray(body.availability)) {
      return NextResponse.json({ error: 'Disponibilidade inválida' }, { status: 400 });
    }

    const response = await fetch(`${API_BASE_URL}/event/${eventId}/people/${personName}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();

      let errorMessage = 'Erro desconhecido';

      switch (response.status) {
        case 401:
          errorMessage = 'Senha incorreta ou não autorizada';
          break;
        case 404:
          errorMessage = 'Evento ou pessoa não encontrada';
          break;
        case 415:
          errorMessage = 'Formato de entrada não suportado';
          break;
        case 422:
          errorMessage = 'Dados de entrada inválidos';
          break;
        case 429:
          errorMessage = 'Muitas requisições';
          break;
        default:
          errorMessage = `Erro da API: ${errorText}`;
      }

      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Proxy: Erro interno no PATCH:', error);

    let errorMessage = 'Erro interno do proxy';

    if (error instanceof SyntaxError) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
