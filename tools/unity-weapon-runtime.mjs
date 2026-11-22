// Resolve the defaults actually assigned to held rifles, before published balance/skills.
// Keep the generated JSON's other weapon fields; fail if the prefab/source format changes.
function component(text, name) {
  const rows = text.split(/\r?\n--- /).filter(row => row.includes('::' + name + '\n') || row.includes('::' + name + '\r\n'));
  if (rows.length !== 1) throw new Error(`Expected one ${name} component in Unity prefab`);
  return rows[0];
}
function scalar(text, name) {
  const matches = [...text.matchAll(new RegExp(`^\\s*${name}:\\s*([0-9]+(?:\\.[0-9]+)?)\\s*$`, 'gm'))];
  if (matches.length !== 1 || Number(matches[0][1]) <= 0) throw new Error(`Missing or ambiguous positive Unity field ${name}`);
  return Number(matches[0][1]);
}
function constant(text, name) {
  const match = text.match(new RegExp(`\\b${name}\\s*=\\s*([0-9]+(?:\\.[0-9]+)?)f?\\s*[,;]`));
  if (!match || Number(match[1]) <= 0) throw new Error(`Missing positive M16 constant ${name}`);
  return Number(match[1]);
}
export function resolveWeaponRuntime(content, akPrefab, playerPrefab, m16Source) {
  const weapon = component(akPrefab, 'ShadowVale.Gameplay.Combat.Weapon');
  const combat = component(playerPrefab, 'ShadowVale.Gameplay.Combat.PlayerCombat');
  const handling = { magazine_size: scalar(combat, 'magazineCapacity'), reload_seconds: scalar(combat, 'reloadSeconds') };
  const runtime = {
    rifle_standard: { damage: scalar(weapon, 'damage'), range: scalar(weapon, 'range'), fire_rate: 1 / scalar(weapon, 'cooldown'), ...handling },
    rifle_m16: { damage: constant(m16Source, 'Damage'), range: constant(m16Source, 'Range'), fire_rate: constant(m16Source, 'RoundsPerMinute') / 60, ...handling },
  };
  const overrides = [];
  const weapons = content.weapons.map(row => {
    const stats = runtime[row.id];
    if (!stats) return { ...row };
    for (const [field, value] of Object.entries(stats)) if (row[field] !== value)
      overrides.push({ code: row.id, field, generated: row[field], runtime: value });
    return { ...row, ...stats };
  });
  for (const id of Object.keys(runtime)) if (!weapons.some(w => w.id === id)) throw new Error(`Missing Unity weapon ${id}`);
  return { content: { ...content, weapons }, overrides };
}
