import { prisma } from '../../db/client';
import type { InsightRequest, InsightResponse, LLMAdapter, LLMContext } from './types.js';

// --- Mock LLM Adapter (replace with OpenAI/Anthropic in production) ---

class MockLLMAdapter implements LLMAdapter {
  async generate(context: LLMContext): Promise<InsightResponse> {
    const { entityType, entityName, recentEvents, question } = context;

    const summary = question
      ? `Analysis of "${question}" for ${entityType} "${entityName}": Based on ${recentEvents.length} recent events and available indicators, the situation shows significant developments requiring continued monitoring.`
      : `Overview of ${entityType} "${entityName}": ${recentEvents.length} recent events recorded. Current data suggests ongoing dynamics with multiple factors influencing the trajectory.`;

    return {
      summary,
      evidence: [
        {
          source: 'WorldLore Database',
          text: `${recentEvents.length} events tracked for ${entityName}.`,
          relevance: 0.95,
        },
        {
          source: 'Indicator Analysis',
          text: `${context.indicators.length} indicators available for contextual assessment.`,
          relevance: 0.8,
        },
      ],
      generatedAt: new Date().toISOString(),
    };
  }
}

// Singleton adapter — swap implementation here when integrating a real LLM
let adapter: LLMAdapter = new MockLLMAdapter();

export function setLLMAdapter(newAdapter: LLMAdapter) {
  adapter = newAdapter;
}

// --- Service ---

export async function generateInsight(request: InsightRequest): Promise<InsightResponse | null> {
  // Conflict insights removed — will be rebuilt with new Conflict Tracker
  const context = await buildCountryContext(request.entityId, request.question);

  if (!context) return null;

  return adapter.generate(context);
}

async function buildCountryContext(id: string, question?: string): Promise<LLMContext | null> {
  const entity = await prisma.entity.findUnique({
    where: { id },
    include: {
      indicators: {
        orderBy: { year: 'desc' },
        distinct: ['indicatorCode'],
        take: 20,
        include: { indicator: { select: { name: true, unit: true } } },
      },
    },
  });

  if (!entity) return null;

  // Get recent OSINT events for this country
  const osintEvents = entity.iso3
    ? await prisma.osintEvent.findMany({
        where: { countryIso3: entity.iso3 },
        orderBy: { eventDate: 'desc' },
        take: 20,
      })
    : [];

  return {
    entityType: 'country',
    entityName: entity.name,
    entityData: {
      iso3: entity.iso3,
      region: entity.region,
      subregion: entity.subregion,
    },
    recentEvents: osintEvents.map((e) => ({
      title: e.title,
      date: e.eventDate.toISOString(),
      description: e.summary ?? undefined,
    })),
    indicators: entity.indicators.map((iv) => ({
      name: iv.indicator.name,
      value: iv.value ? Number(iv.value) : null,
      year: iv.year,
    })),
    question,
  };
}
