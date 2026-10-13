import seed from '../../src/features/content/contracts/demo-bundle.json' with { type: 'json' };
import { editorToEntities, entitiesToEditor, resources } from '../../src/features/content/apiModel.ts';

const publishedId = '00000000-0000-4000-8000-000000000001';
const draftId = '00000000-0000-4000-8000-000000000002';
const createdAt = '2026-10-13T00:00:00Z';
const page = items => ({ items, page: 1, pageSize: 100, totalCount: items.length, totalPages: 1 });
const user = role => ({ id: role, username: role, fullName: `UI Test ${role}`, email: `${role}@example.test`, role: role[0].toUpperCase() + role.slice(1), isActive: true, createdAt });
const auth = role => ({ user: user(role), accessToken: `ui-test-${role}`, refreshToken: `ui-refresh-${role}`, accessTokenExpiresAt: '2099-01-01T00:00:00Z', refreshTokenExpiresAt: '2099-02-01T00:00:00Z' });
const enums = { solverAlgorithms: [], solverFamilies: [], sessionOutcomes: [], encounterOutcomes: [], sessionSources: ['Human', 'Replay'], itemTypes: ['Weapon','Ammo','Consumable','Material','Quest'], itemRarities: ['Common','Uncommon','Rare','Epic','Legendary'], weaponClasses: ['Pistol','Rifle','Smg','Shotgun','Sniper','Melee'], skillTypes: ['Active','Passive'], contentStatuses: ['Draft','InReview','Approved','Published','Rejected','Archived'] };

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
