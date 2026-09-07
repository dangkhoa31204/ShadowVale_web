import React, { useState } from 'react';
import { useToast } from '../../../components/ui/Toast';

type EntityCategory = 'ALL' | 'OPERATIVE' | 'WEAPON' | 'GEAR' | 'ENEMY';

interface GameEntity {
  id: string;
  code: string;
  name: string;
  category: 'OPERATIVE' | 'WEAPON' | 'GEAR' | 'ENEMY';
  tier: 'LEGENDARY' | 'EPIC' | 'RARE' | 'STANDARD';
  damage: number;
  fireRate: number;
  range: number;
  armorPiercing: number;
  description: string;
  status: 'ACTIVE' | 'TESTING' | 'ARCHIVED';
}

const INITIAL_ENTITIES: GameEntity[] = [
  {
    id: 'ent-01',
    code: 'WPN-AR-PHANTOM',
    name: 'Phantom-9 Bullpup Rifle',
    category: 'WEAPON',
    tier: 'LEGENDARY',
    damage: 78,
    fireRate: 650,
    range: 82,
    armorPiercing: 45,
    description: 'Sub-harmonic suppressed assault rifle engineered for high-altitude covert incursions.',
    status: 'ACTIVE',
  },
  {
    id: 'ent-02',
    code: 'OPR-VANGUARD-KAI',
    name: 'Operative "Vanguard" Kai',
    category: 'OPERATIVE',
    tier: 'EPIC',
    damage: 85,
    fireRate: 500,
    range: 70,
    armorPiercing: 60,
    description: 'Frontline assault specialist with kinetic barrier deployable shield.',
    status: 'ACTIVE',
  },
  {
    id: 'ent-03',
    code: 'WPN-SNP-VOID',
    name: 'Void Piercer Gauss Rifle',
    category: 'WEAPON',
    tier: 'LEGENDARY',
    damage: 195,
    fireRate: 45,
    range: 100,
    armorPiercing: 95,
    description: 'Heavy magnetic rail accelerator capable of puncturing mechanized exoskeleton plating.',
    status: 'ACTIVE',
  },
  {
    id: 'ent-04',
    code: 'GEAR-EMP-GRENADE',
    name: 'EMP Disruption Core v3',
    category: 'GEAR',
    tier: 'RARE',
    damage: 30,
    fireRate: 100,
    range: 40,
    armorPiercing: 80,
    description: 'Deploys a concentrated micro-emp blast that drains enemy kinetic shields instantly.',
    status: 'TESTING',
  },
  {
    id: 'ent-05',
    code: 'ENM-TITAN-COLOSSUS',
    name: 'Corrupted Titan Colossus',
    category: 'ENEMY',
    tier: 'LEGENDARY',
    damage: 150,
    fireRate: 120,
    range: 65,
    armorPiercing: 90,
    description: 'Autonomous rogue mining mech repurposed with high-yield thermal cannons.',
    status: 'ACTIVE',
  },
];

export const EntityEditorPage: React.FC = () => {
  const { success, info } = useToast();
  const [entities, setEntities] = useState<GameEntity[]>(INITIAL_ENTITIES);
  const [selectedEntityId, setSelectedEntityId] = useState<string>(INITIAL_ENTITIES[0].id);
  const [activeCategory, setActiveCategory] = useState<EntityCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedEntity = entities.find((e) => e.id === selectedEntityId) || entities[0];

  const handleStatChange = (field: keyof GameEntity, value: any) => {
    setEntities((prev) =>
      prev.map((e) => (e.id === selectedEntity.id ? { ...e, [field]: value } : e))
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    success(`Entity [${selectedEntity.name}] configuration committed to staging balance.`);
  };

  const handleDuplicate = () => {
    const newId = `ent-${Date.now().toString().slice(-4)}`;
    const cloned: GameEntity = {
      ...selectedEntity,
      id: newId,
      code: `${selectedEntity.code}-COPY`,
      name: `${selectedEntity.name} (Copy)`,
      status: 'TESTING',
    };
    setEntities((prev) => [...prev, cloned]);
    setSelectedEntityId(newId);
    info(`Duplicated entity created as [${cloned.name}]`);
  };

  const filteredEntities = entities.filter((item) => {
    const matchCat = activeCategory === 'ALL' || item.category === activeCategory;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-container-max mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-border-subtle pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-base">precision_manufacturing</span>
            <span className="font-data-mono text-xs text-primary uppercase tracking-wider font-bold">
              GAMEPLAY BALANCING ENGINE
            </span>
          </div>
          <h1 className="font-headline-md text-2xl font-bold text-on-surface tracking-tight">
            TACTICAL ENTITY & STAT EDITOR
          </h1>
          <p className="text-body-md text-on-surface-variant text-sm mt-0.5">
            Configure weapon attributes, hero parameters, damage curves, and balancing multipliers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDuplicate}
            className="px-3 py-1.5 rounded border border-outline-variant hover:border-primary text-on-surface-variant hover:text-primary font-label-caps text-xs flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">content_copy</span>
            Duplicate Entity
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Entity Catalog (Left) + Inspector Form (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Catalog List */}
        <div className="lg:col-span-5 bg-surface border border-border-subtle rounded p-4 flex flex-col h-[700px]">
          {/* Search bar */}
          <div className="relative mb-3">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-surface-container-lowest border border-border-subtle rounded text-xs font-data-mono text-on-surface focus:border-primary focus:outline-none"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1 mb-4 pb-3 border-b border-border-subtle font-label-caps text-[11px]">
            {(['ALL', 'OPERATIVE', 'WEAPON', 'GEAR', 'ENEMY'] as EntityCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeCategory === cat
                    ? 'bg-primary text-on-primary font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Entity Item List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredEntities.map((ent) => {
              const isSelected = ent.id === selectedEntity.id;
              return (
                <div
                  key={ent.id}
                  onClick={() => setSelectedEntityId(ent.id)}
                  className={`p-3 rounded border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-surface-container-high border-primary'
                      : 'bg-surface-container border-border-subtle hover:border-outline-variant'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-data-mono text-[10px] text-primary">
                      {ent.code}
                    </span>
                    <span
                      className={`text-[9px] font-data-mono px-1.5 py-0.2 rounded uppercase font-bold ${
                        ent.tier === 'LEGENDARY'
                          ? 'bg-tertiary/20 text-tertiary'
                          : ent.tier === 'EPIC'
                          ? 'bg-info/20 text-info'
                          : 'bg-surface-variant text-on-surface-variant'
                      }`}
                    >
                      {ent.tier}
                    </span>
                  </div>
                  <h4 className="font-title-sm text-xs font-bold text-on-surface">
                    {ent.name}
                  </h4>
                  <div className="flex justify-between items-center mt-2 text-[10px] font-data-mono text-on-surface-variant">
                    <span>{ent.category}</span>
                    <span className="text-success">{ent.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Inspector / Parameter Adjuster */}
        <div className="lg:col-span-7 bg-surface border border-border-subtle rounded p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex items-center justify-between border-b border-border-subtle pb-4">
              <div>
                <span className="font-data-mono text-xs text-primary">{selectedEntity.code}</span>
                <h2 className="font-headline-md text-xl font-bold text-on-surface mt-0.5">
                  {selectedEntity.name}
                </h2>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-on-primary font-label-caps text-xs rounded hover:bg-primary-container hover:text-on-primary-container transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">save</span>
                Commit Attributes
              </button>
            </div>

            {/* General Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-label-caps text-xs text-on-surface-variant mb-1 uppercase">
                  Entity Display Name
                </label>
                <input
                  type="text"
                  value={selectedEntity.name}
                  onChange={(e) => handleStatChange('name', e.target.value)}
                  className="w-full bg-surface-container-lowest border border-border-subtle rounded p-2 text-xs font-data-mono text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-label-caps text-xs text-on-surface-variant mb-1 uppercase">
                  System Status
                </label>
                <select
                  value={selectedEntity.status}
                  onChange={(e) => handleStatChange('status', e.target.value)}
                  className="w-full bg-surface-container-lowest border border-border-subtle rounded p-2 text-xs font-data-mono text-on-surface focus:border-primary focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE (PRODUCTION)</option>
                  <option value="TESTING">TESTING (SANDBOX)</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
            </div>

            {/* Tactical Sliders / Numeric Parameters */}
            <div className="space-y-4 pt-2 border-t border-border-subtle">
              <h3 className="font-label-caps text-xs text-on-surface-variant uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary">equalizer</span>
                Kinetic & Combat Values
              </h3>

              {/* Damage */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-data-mono">
                  <span className="text-on-surface">Base Kinetic Damage</span>
                  <span className="text-primary font-bold">{selectedEntity.damage} DMG</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="250"
                  value={selectedEntity.damage}
                  onChange={(e) => handleStatChange('damage', Number(e.target.value))}
                  className="w-full accent-primary bg-surface-container h-2 rounded cursor-pointer"
                />
              </div>

              {/* Fire Rate */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-data-mono">
                  <span className="text-on-surface">Cycling Rate (RPM)</span>
                  <span className="text-primary font-bold">{selectedEntity.fireRate} RPM</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="1200"
                  value={selectedEntity.fireRate}
                  onChange={(e) => handleStatChange('fireRate', Number(e.target.value))}
                  className="w-full accent-primary bg-surface-container h-2 rounded cursor-pointer"
                />
              </div>

              {/* Range */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-data-mono">
                  <span className="text-on-surface">Effective Tactical Range</span>
                  <span className="text-primary font-bold">{selectedEntity.range} m</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="150"
                  value={selectedEntity.range}
                  onChange={(e) => handleStatChange('range', Number(e.target.value))}
                  className="w-full accent-primary bg-surface-container h-2 rounded cursor-pointer"
                />
              </div>

              {/* Armor Piercing */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-data-mono">
                  <span className="text-on-surface">Armor Piercing Coefficient</span>
                  <span className="text-tertiary font-bold">{selectedEntity.armorPiercing}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedEntity.armorPiercing}
                  onChange={(e) => handleStatChange('armorPiercing', Number(e.target.value))}
                  className="w-full accent-tertiary bg-surface-container h-2 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Lore & Tactical Description */}
            <div className="pt-2 border-t border-border-subtle">
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1 uppercase">
                Tactical Dossier / Lore Description
              </label>
              <textarea
                rows={3}
                value={selectedEntity.description}
                onChange={(e) => handleStatChange('description', e.target.value)}
                className="w-full bg-surface-container-lowest border border-border-subtle rounded p-2.5 text-xs font-body-md text-on-surface focus:border-primary focus:outline-none resize-none"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EntityEditorPage;
