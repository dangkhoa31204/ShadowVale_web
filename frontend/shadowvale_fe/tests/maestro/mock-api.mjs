import seed from '../../src/features/content/contracts/demo-bundle.json' with { type: 'json' };
import { editorToEntities, entitiesToEditor, resources } from '../../src/features/content/apiModel.ts';

const publishedId = '00000000-0000-4000-8000-000000000001';
const draftId = '00000000-0000-4000-8000-000000000002';
const createdAt = '2026-10-13T00:00:00Z';
const page = items => ({ items, page: 1, pageSize: 100, totalCount: items.length, totalPages: 1 });
const user = role => ({ id: role, username: role, fullName: `UI Test ${role}`, email: `${role}@example.test`, role: role[0].toUpperCase() + role.slice(1), isActive: true, createdAt });
const auth = role => ({ user: user(role), accessToken: `ui-test-${role}`, refreshToken: `ui-refresh-${role}`, accessTokenExpiresAt: '2099-01-01T00:00:00Z', refreshTokenExpiresAt: '2099-02-01T00:00:00Z' });
const enums = { solverAlgorithms: ['Greedy','Genetic','ClassicalSa','Sqa','Qiea','Qaoa','QpuDwave'], solverFamilies: ['classical','quantum_inspired','quantum_hardware'], sessionOutcomes: [], encounterOutcomes: [], sessionSources: ['Human', 'Replay'], itemTypes: ['Weapon','Ammo','Consumable','Material','Quest'], itemRarities: ['Common','Uncommon','Rare','Epic','Legendary'], weaponClasses: ['Pistol','Rifle','Smg','Shotgun','Sniper','Melee'], skillTypes: ['Active','Passive'], contentStatuses: ['Draft','InReview','Approved','Published','Rejected','Archived'] };

// Aggregate analytics fixtures in the BE DTO shapes (numbers only; no player identities).
const solverConfigs = [['greedy_default','Greedy','classical'],['sa_default','ClassicalSa','classical'],['sqa_default','Sqa','quantum_inspired'],['qaoa_default','Qaoa','quantum_inspired']]
  .map(([code, algorithm, family], i) => ({ id: `solver-${i + 1}`, code, name: code.replace('_default', '').toUpperCase() + ' default', algorithm, family, variant: 'default', library: null, params: {}, quboWeights: {},
    timeBudgetMs: 250, isActive: i < 3, isAbArm: family !== 'quantum_hardware', sessionCount: i < 2 ? 12 : 0, resultCount: i < 2 ? 40 : 0, createdAt, updatedAt: createdAt }));
const analytics = {
  '/analytics/funnel': { sessionsStarted: 52, objectives: [{ objectiveIndex: 1, sessions: 44, shareOfStarted: 44 / 52 }, { objectiveIndex: 2, sessions: 33, shareOfStarted: 33 / 52 }], missionsCompleted: 31, completionRate: 31 / 52 },
  '/analytics/weapons': { finishedSessions: 55, weapons: [['rifle_standard', 410, 61, 30], ['smg_compact', 288, 37, 22], ['pistol_silenced', 96, 19, 17], ['sniper_bolt', 41, 14, 9]]
    .map(([weapon, shots, kills, sessionsUsed]) => ({ weapon, shots, kills, killsPerShot: kills / shots, sessionsUsed, sessionShare: sessionsUsed / 55 })) },
  '/analytics/playstyle': { finishedSessions: 55, sessionsWithoutKills: 6, avgStealthRatio: 0.46, medianStealthRatio: 0.5, avgTimesDetected: 2.3, medianTimesDetected: 2,
    stealthRatioHistogram: [[0, 0.25, 14], [0.25, 0.5, 12], [0.5, 0.75, 13], [0.75, 1, 10]].map(([from, to, sessions]) => ({ from, to, sessions })) },
  '/analytics/heatmap': { mapCode: 'map01_docks', cellSize: 5, eventTypes: ['player_death'], cells: Array.from({ length: 24 }, (_, i) => ({ x: (i % 6) * 5, y: Math.floor(i / 6) * 5, count: (i * 7) % 9 + 1 })) },
  '/analytics/ai/comparison': solverConfigs.slice(0, 3).map((c, i) => ({ contentVersionId: publishedId, contentVersionLabel: 'Maestro published content', groupKey: c.id, groupLabel: c.code, family: c.family,
    sessions: 18 - i * 3, encounters: 40 - i * 6, captures: 22 - i * 5, escapes: 18 - i, captureRate: (22 - i * 5) / (40 - i * 6), avgEscapeSeconds: 95 + i * 12, medianEscapeSeconds: 90, replans: 60, avgCoordinationScore: 0.71 - i * 0.04,
    latencyP50Ms: 18 + i * 30, latencyP95Ms: 42 + i * 55, latencyP99Ms: 60 + i * 70, withinBudgetRate: 0.98 - i * 0.06, fallbackRate: 0.01 + i * 0.03 })),
  '/analytics/ai/scalability': solverConfigs.slice(0, 3).flatMap((c, i) => [2, 4, 6, 8].map(numAgents => ({ configurationId: c.id, code: c.code, family: c.family, numAgents, nodesFrom: 20, nodesTo: 60,
    replans: 10 + numAgents, latencyP50Ms: (8 + i * 20) * numAgents / 2, latencyP95Ms: (14 + i * 35) * numAgents / 2, avgObjective: -12.5 + numAgents, withinBudgetRate: 1 - i * 0.05 - numAgents * 0.01 }))),
};

export function mockApi() {
  const versions = [
    { id: publishedId, versionNo: 1, label: 'Maestro published content', status: 'Published', publishedAt: createdAt },
    { id: draftId, versionNo: 2, label: 'Maestro draft content', status: 'Draft', publishedAt: null },
  ].map(v => ({ changelog: 'Local UI fixture only', parentVersionId: null, revision: 1, schemaVersion: '1.0', validationErrors: [], authoredById: 'designer', submittedAt: null, reviewedById: 'admin', reviewedAt: createdAt, reviewNote: null, publishedById: 'admin', archivedAt: null, createdAt, updatedAt: createdAt, validatedAt: createdAt, bundleChecksum: 'ui-fixture-checksum', ...v }));
  const entities = Object.fromEntries(versions.map(v => {
    const bundle = structuredClone(seed);
    const data = editorToEntities(bundle);
    for (const [key] of resources) data[key].forEach((r, i) => { r.id = `${key}-${i + 1}`; r.updatedAt = createdAt; });
    return [v.id, data];
  }));
  return async (req, res, next) => {
    if (!req.url.startsWith('/api/')) return next();
    const url = new URL(req.url, 'http://localhost'), route = url.pathname.slice(4);
    const send = (data, status = 200) => { res.statusCode = status; res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(data)); };
    let body = '';
    for await (const chunk of req) body += chunk;
    const input = body ? JSON.parse(body) : {};
    const role = String(req.headers.authorization || '').replace('Bearer ui-test-', '');
    if (route === '/auth/login') {
      if (['admin','designer','analyst'].includes(input.usernameOrEmail) && input.password === 'UiTest123!') return send(auth(input.usernameOrEmail));
      return send({status:401,code:'INVALID_CREDENTIALS',message:'Invalid UI test credentials.'},401);
    }
    if (!['admin','designer','analyst'].includes(role)) return send({status:401,message:'UI test session required.'},401);
    if (route === '/auth/me') return send(user(role));
    if (route === '/auth/logout') return send({});
    if (route === '/meta/enums') return send(enums);
    if (route === '/users') return send(page(['admin','designer','analyst'].map(user)));
    if (route === '/content-publications') return send(page([]));
    if (Object.hasOwn(analytics, route)) return send(analytics[route]);
    if (route === '/solver-configurations') return send(solverConfigs);
    const solverMatch = route.match(/^\/solver-configurations\/([^/]+)$/);
    if (solverMatch && req.method === 'GET') return send(solverConfigs.find(c => c.id === solverMatch[1]) ?? {});
    if (route === '/content-versions') return send(page(versions.filter(v => url.searchParams.get('status') === 'Archived' ? v.status === 'Archived' : v.status !== 'Archived')));
    const match = route.match(/^\/content-versions\/([^/]+)(?:\/([^/]+)(?:\/([^/]+))?)?$/);
    if (match) {
      const [, id, resourceRoute, recordId] = match, version = versions.find(v => v.id === id);
      if (!version) return send({status:404,message:'Fixture version not found.'},404);
      if (!resourceRoute) return send({version,bundle:entitiesToEditor(version,entities[id])});
      const resource = resources.find(r => r[1] === resourceRoute);
      if (resource) {
        const rows = entities[id][resource[0]], row = rows.find(r => r.id === recordId);
        if (req.method === 'GET') return send(recordId ? row : rows);
        if (req.method === 'PUT' && row && version.status === 'Draft') { Object.assign(row,input); version.revision++; return send(row); }
      }
    }
    // Unknown endpoints fail loudly; the fixture never forwards to real BE.
    return send({status:501,message:`Not implemented by UI fixture: ${req.method} ${route}`},501);
  };
}
