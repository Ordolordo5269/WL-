// @ts-expect-error no type declarations available
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'WorldLore API',
      version: '1.0.0',
      description: 'Geopolitical analysis platform — conflicts, country indicators, OSINT events, and AI-powered insights.',
    },
    servers: [
      { url: '/api', description: 'API base path' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // --- Conflicts ---
        ConflictSummary: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            slug: { type: 'string' },
            name: { type: 'string' },
            country: { type: 'string' },
            region: { type: 'string' },
            status: { type: 'string', enum: ['WAR', 'WARM', 'IMPROVING', 'RESOLVED', 'FROZEN'] },
            conflictType: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            casualties: { type: 'array', items: { $ref: '#/components/schemas/Casualty' } },
            factions: { type: 'array', items: { $ref: '#/components/schemas/Faction' } },
          },
        },
        Casualty: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            date: { type: 'string', format: 'date-time' },
            military: { type: 'integer', nullable: true },
            civilian: { type: 'integer', nullable: true },
            total: { type: 'integer' },
          },
        },
        Faction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            goals: { type: 'array', items: { type: 'string' } },
            allies: { type: 'array', items: { type: 'string' } },
            support: { type: 'array', items: { $ref: '#/components/schemas/FactionSupport' } },
          },
        },
        FactionSupport: {
          type: 'object',
          properties: {
            supporterISO: { type: 'string' },
            supportType: { type: 'string' },
            weapons: { type: 'array', items: { type: 'string' } },
          },
        },
        // --- Countries ---
        CountryOverview: {
          type: 'object',
          properties: {
            iso3: { type: 'string' },
            name: { type: 'string' },
            region: { type: 'string' },
            population: { type: 'number', nullable: true },
            gdp: { type: 'number', nullable: true },
            hdi: { type: 'number', nullable: true },
            conflictCount: { type: 'integer' },
            riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          },
        },
        // --- Auth ---
        AuthTokens: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            refreshToken: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                name: { type: 'string', nullable: true },
              },
            },
          },
        },
        // --- Insights ---
        InsightRequest: {
          type: 'object',
          required: ['entityType', 'entityId'],
          properties: {
            entityType: { type: 'string', enum: ['conflict', 'country'] },
            entityId: { type: 'string', format: 'uuid' },
            question: { type: 'string' },
          },
        },
        InsightResponse: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            evidence: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  source: { type: 'string' },
                  text: { type: 'string' },
                  relevance: { type: 'number', minimum: 0, maximum: 1 },
                },
              },
            },
            generatedAt: { type: 'string', format: 'date-time' },
          },
        },
        // --- Dashboard ---
        DashboardSummary: {
          type: 'object',
          properties: {
            totalConflicts: { type: 'integer' },
            activeConflicts: { type: 'integer' },
            countriesAffected: { type: 'integer' },
            avgSeverity: { type: 'number' },
          },
        },
        // --- Common ---
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    paths: {
      // --- Conflicts v2 ---
      '/conflicts/v2': {
        get: {
          tags: ['Conflicts'],
          summary: 'List curated conflicts',
          parameters: [
            { name: 'region', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['WAR', 'WARM', 'IMPROVING', 'RESOLVED', 'FROZEN'] } },
            { name: 'country', in: 'query', schema: { type: 'string' } },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          ],
          responses: {
            200: { description: 'List of conflicts', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/ConflictSummary' } }, count: { type: 'integer' } } } } } },
          },
        },
      },
      '/conflicts/v2/{slug}': {
        get: {
          tags: ['Conflicts'],
          summary: 'Get conflict detail by slug',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Conflict detail with OSINT enrichment' },
            404: { description: 'Not found' },
          },
        },
      },
      // --- Countries ---
      '/countries/{iso3}/overview': {
        get: {
          tags: ['Countries'],
          summary: 'Get country overview',
          parameters: [{ name: 'iso3', in: 'path', required: true, schema: { type: 'string', minLength: 3, maxLength: 3 } }],
          responses: {
            200: { description: 'Country overview', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/CountryOverview' } } } } } },
            404: { description: 'Country not found' },
          },
        },
      },
      // --- Auth ---
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login with email and password',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } } } } },
          responses: {
            200: { description: 'JWT tokens', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } } },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 6 }, name: { type: 'string' } } } } } },
          responses: {
            201: { description: 'User created + tokens', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } } },
            409: { description: 'Email already exists' },
          },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Rotate JWT tokens',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } } },
          responses: {
            200: { description: 'New tokens' },
            401: { description: 'Invalid or expired refresh token' },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user profile',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'User profile' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      // --- Insights ---
      '/insights': {
        post: {
          tags: ['Insights'],
          summary: 'Generate AI insight for an entity',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/InsightRequest' } } } },
          responses: {
            200: { description: 'Generated insight', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/InsightResponse' } } } } } },
            401: { description: 'Unauthorized' },
            404: { description: 'Entity not found' },
          },
        },
      },
      // --- Dashboard ---
      '/dashboard/summary': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get global dashboard statistics',
          responses: {
            200: { description: 'Dashboard summary', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/DashboardSummary' } } } } } },
          },
        },
      },
      // --- OSINT ---
      '/osint/events': {
        get: {
          tags: ['OSINT'],
          summary: 'List OSINT events',
          parameters: [
            { name: 'macroLayer', in: 'query', schema: { type: 'string', enum: ['CONFLICT_SECURITY', 'GOVERNANCE_DIPLOMACY', 'ECONOMIC_COERCION', 'HUMANITARIAN_DISASTER', 'CYBER_INFO'] } },
            { name: 'severity', in: 'query', schema: { type: 'string', enum: ['CRITICAL', 'HIGH', 'ELEVATED', 'MODERATE', 'LOW'] } },
            { name: 'countryIso3', in: 'query', schema: { type: 'string' } },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          ],
          responses: {
            200: { description: 'List of OSINT events' },
          },
        },
      },
      '/osint/alerts': {
        get: {
          tags: ['OSINT'],
          summary: 'List active OSINT alerts',
          responses: { 200: { description: 'List of alerts' } },
        },
      },
      '/osint/sources': {
        get: {
          tags: ['OSINT'],
          summary: 'OSINT sources health check',
          responses: { 200: { description: 'Source statuses' } },
        },
      },
    },
  },
  apis: [], // We define paths inline above, no JSDoc annotations needed
};

export const swaggerSpec = swaggerJsdoc(options);
