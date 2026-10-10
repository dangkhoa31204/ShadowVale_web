import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(fs.readFileSync(path.resolve(root, '../../backend/shadowvale_be/docs/openapi.json'), 'utf8'));
function type(s) {
  if (s.$ref) return s.$ref.split('/').at(-1);
  if (s.oneOf || s.anyOf) return (s.oneOf || s.anyOf).map(type).join(' | ');
  if (s.enum) return s.enum.map(v => JSON.stringify(v)).join(' | ');
  if (Array.isArray(s.type)) return [...new Set(s.type.map(t => type({ ...s, type: t })))].join(' | ');
  if (s.type === 'null') return 'null';
  if (s.type === 'array') return 'Array<' + type(s.items || {}) + '>';
  if (s.type === 'integer' || s.type === 'number') return 'number';
  if (s.type === 'string' || s.type === 'boolean') return s.type;
  if (s.properties) return '{\n' + Object.entries(s.properties).map(([k,v]) => '  ' + JSON.stringify(k) + (s.required?.includes(k) ? '' : '?') + ': ' + type(v) + ';').join('\n') + '\n}';
  if (s.additionalProperties) return 'Record<string, ' + (typeof s.additionalProperties === 'object' ? type(s.additionalProperties) : 'JsonValue') + '>';
  return 'JsonValue';
}
const schemas = contract.components.schemas;
// Current dev OpenAPI omits response schemas on the ServiceResult-backed version controller.
// Read its public positional DTO records directly; keep the FE contract aligned with source.
function recordProperty(csharp) {
  if (csharp.endsWith('?')) return { oneOf: [{type:'null'}, recordProperty(csharp.slice(0,-1))] };
  if (csharp.startsWith('IReadOnlyList<')) return {type:'array',items:recordProperty(csharp.slice(14,-1))};
  if (['long','int'].includes(csharp)) return {type:'integer'};
  if (csharp === 'bool') return {type:'boolean'};
  if (['string','Guid','DateTime'].includes(csharp)) return {type:'string'};
  return {$ref:'#/components/schemas/'+csharp};
}
for (const filename of ['ContentVersionDto.cs','AdminContentRequests.cs']) {
  const source = fs.readFileSync(path.resolve(root, '../../backend/shadowvale_be/ShadowVale.BLL/DTOs/Content', filename), 'utf8');
  for (const [,name,parameters] of source.matchAll(/public sealed record (\w+)\(([\s\S]*?)\);/g)) {
    if (schemas[name]) continue;
    const properties = Object.fromEntries(parameters.split(',').map(p => {
      const [,csharp,key] = p.trim().match(/^(\S+)\s+(\w+)/);
      return [key[0].toLowerCase()+key.slice(1), recordProperty(csharp)];
    }));
    schemas[name] = {type:'object',properties,required:Object.keys(properties)};
  }
}
// OpenAPI collapses the two C# WeaponDto names (authoring and analytics).
// Preserve the actual authoring shape from WeaponRequest instead of treating item.weapon as telemetry.
schemas.AuthoringWeaponDto = { ...schemas.WeaponRequest, required: Object.keys(schemas.WeaponRequest.properties) };
schemas.ItemDto.properties.weapon = { oneOf: [{ type: 'null' }, { $ref: '#/components/schemas/AuthoringWeaponDto' }] };
const output = '// Generated from checked-in BE OpenAPI. Run node scripts/sync-api-contract.mjs after changes.\nexport type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };\n' + Object.entries(schemas).map(([name,s]) => 'export type ' + name + ' = ' + (name === 'JsonElement' ? 'JsonValue' : type(s)) + ';').join('\n');
fs.writeFileSync(path.join(root, 'src/services/api/contracts.ts'), output + '\n');
fs.writeFileSync(path.join(root, 'src/services/api/contract-schema.json'), JSON.stringify(schemas, null, 2) + '\n');
const operations = Object.entries(contract.paths).flatMap(([url,p]) => Object.entries(p).filter(([m]) => ['get','post','put','patch','delete'].includes(m)).map(([method]) => ({ method: method.toUpperCase(), url })));
fs.writeFileSync(path.join(root, 'src/services/api/operations.json'), JSON.stringify(operations, null, 2) + '\n');
console.log('Synced ' + Object.keys(schemas).length + ' schemas and ' + operations.length + ' operations.');
