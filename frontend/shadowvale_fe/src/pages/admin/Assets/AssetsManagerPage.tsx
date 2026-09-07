import React, { useState } from 'react';
import { useToast } from '../../../components/ui/Toast';

type AssetType = 'ALL' | 'MESH' | 'TEXTURE' | 'AUDIO' | 'UI';

interface GameAsset {
  id: string;
  name: string;
  type: 'MESH' | 'TEXTURE' | 'AUDIO' | 'UI';
  format: string;
  size: string;
  updatedAt: string;
  polyCount?: string;
  resolution?: string;
  author: string;
}

const INITIAL_ASSETS: GameAsset[] = [
  {
    id: 'ast-001',
    name: 'Operative_Kai_Body_HighPoly',
    type: 'MESH',
    format: '.FBX',
    size: '42.8 MB',
    updatedAt: '2026-09-02',
    polyCount: '64,210 tris',
    author: 'Lead_Artist_VFX',
  },
  {
    id: 'ast-002',
    name: 'PhantomRifle_Diffuse_4K',
    type: 'TEXTURE',
    format: '.PNG',
    size: '18.4 MB',
    updatedAt: '2026-09-04',
    resolution: '4096 x 4096',
    author: 'Mat_Specialist_01',
  },
  {
    id: 'ast-003',
    name: 'SFX_Railgun_Fire_Burst',
    type: 'AUDIO',
    format: '.WAV',
    size: '2.1 MB',
    updatedAt: '2026-08-30',
    resolution: '96kHz / 24bit',
    author: 'Sound_Designer_Neo',
  },
  {
    id: 'ast-004',
    name: 'HUD_Tactical_Minimap_Atlas',
    type: 'UI',
    format: '.SVG',
    size: '840 KB',
    updatedAt: '2026-09-06',
    resolution: 'Vector Scalable',
    author: 'UI_Core_Team',
  },
  {
    id: 'ast-005',
    name: 'Corrupted_Titan_Mech_Rig',
    type: 'MESH',
    format: '.GLTF',
    size: '89.2 MB',
    updatedAt: '2026-09-01',
    polyCount: '112,800 tris',
    author: 'Lead_Artist_VFX',
  },
  {
    id: 'ast-006',
    name: 'Citadel_Terrain_NormalMap_8K',
    type: 'TEXTURE',
    format: '.EXR',
    size: '64.0 MB',
    updatedAt: '2026-08-28',
    resolution: '8192 x 8192',
    author: 'Environment_Lead',
  },
];

export const AssetsManagerPage: React.FC = () => {
  const { success, info } = useToast();
  const [assets, setAssets] = useState<GameAsset[]>(INITIAL_ASSETS);
  const [selectedType, setSelectedType] = useState<AssetType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<GameAsset | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const filteredAssets = assets.filter((ast) => {
    const matchType = selectedType === 'ALL' || ast.type === selectedType;
    const matchSearch =
      ast.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ast.format.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ast.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const handleSimulateUpload = () => {
    setIsUploadOpen(false);
    const newAsset: GameAsset = {
      id: `ast-${Date.now().toString().slice(-3)}`,
      name: `New_Tactical_Asset_${Date.now().toString().slice(-4)}`,
      type: 'MESH',
      format: '.GLTF',
      size: '14.2 MB',
      updatedAt: 'Just now',
      polyCount: '32,000 tris',
      author: 'Current_Admin',
    };
    setAssets([newAsset, ...assets]);
    success(`Asset [${newAsset.name}] uploaded and ingested into CDN bundle.`);
  };

  return (
    <div className="max-w-container-max mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-border-subtle pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-base">inventory_2</span>
            <span className="font-data-mono text-xs text-primary uppercase tracking-wider font-bold">
              CDN & REPOSITORY REGISTRY
            </span>
          </div>
          <h1 className="font-headline-md text-2xl font-bold text-on-surface tracking-tight">
            CENTRAL ASSET MANAGER
          </h1>
          <p className="text-body-md text-on-surface-variant text-sm mt-0.5">
            Manage 3D models, textures, audio stems, and UI atlases compiled into client bundles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2 bg-primary text-on-primary font-label-caps text-xs rounded hover:bg-primary-container hover:text-on-primary-container transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">upload</span>
            Upload Ingestion
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-surface border border-border-subtle rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1 font-label-caps text-xs">
          {(['ALL', 'MESH', 'TEXTURE', 'AUDIO', 'UI'] as AssetType[]).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded transition-colors ${
                selectedType === t
                  ? 'bg-primary text-on-primary font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-2 text-on-surface-variant text-sm">
            search
          </span>
          <input
            type="text"
            placeholder="Filter by name, extension..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-surface-container-lowest border border-border-subtle rounded text-xs font-data-mono text-on-surface focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Asset Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssets.map((ast) => (
          <div
            key={ast.id}
            onClick={() => setSelectedAsset(ast)}
            className="bg-surface border border-border-subtle hover:border-primary/60 transition-all rounded p-4 cursor-pointer flex flex-col justify-between group"
          >
            <div>
              {/* Thumbnail Placeholder with Tactical Icon */}
              <div className="h-32 bg-surface-container rounded mb-3 flex items-center justify-center border border-border-subtle relative overflow-hidden group-hover:border-primary/40 transition-colors">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 group-hover:text-primary/70 transition-colors">
                  {ast.type === 'MESH'
                    ? 'view_in_ar'
                    : ast.type === 'TEXTURE'
                    ? 'image'
                    : ast.type === 'AUDIO'
                    ? 'graphic_eq'
                    : 'dashboard_customize'}
                </span>
                <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-surface-dim font-data-mono text-[10px] text-primary rounded border border-border-subtle">
                  {ast.format}
                </span>
              </div>

              <h3 className="font-title-sm text-sm font-bold text-on-surface truncate">
                {ast.name}
              </h3>
              <p className="font-data-mono text-[11px] text-on-surface-variant mt-0.5">
                By {ast.author}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] font-data-mono text-on-surface-variant">
              <span>{ast.size}</span>
              <span>{ast.updatedAt}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Asset Details Inspector Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border-subtle max-w-lg w-full rounded p-6 shadow-2xl relative">
            <div className="flex justify-between items-start mb-4 border-b border-border-subtle pb-3">
              <div>
                <span className="font-data-mono text-xs text-primary">{selectedAsset.format}</span>
                <h3 className="font-title-sm text-base font-bold text-on-surface mt-0.5 break-all">
                  {selectedAsset.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-data-mono mb-6">
              <div className="flex justify-between p-2 bg-surface-container rounded">
                <span className="text-on-surface-variant">Asset ID</span>
                <span className="text-on-surface">{selectedAsset.id}</span>
              </div>
              <div className="flex justify-between p-2 bg-surface-container rounded">
                <span className="text-on-surface-variant">File Size</span>
                <span className="text-on-surface">{selectedAsset.size}</span>
              </div>
              {selectedAsset.polyCount && (
                <div className="flex justify-between p-2 bg-surface-container rounded">
                  <span className="text-on-surface-variant">Polygon Density</span>
                  <span className="text-primary">{selectedAsset.polyCount}</span>
                </div>
              )}
              {selectedAsset.resolution && (
                <div className="flex justify-between p-2 bg-surface-container rounded">
                  <span className="text-on-surface-variant">Resolution / Fidelity</span>
                  <span className="text-primary">{selectedAsset.resolution}</span>
                </div>
              )}
              <div className="flex justify-between p-2 bg-surface-container rounded">
                <span className="text-on-surface-variant">Author / Committer</span>
                <span className="text-on-surface">{selectedAsset.author}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 font-label-caps text-xs">
              <button
                onClick={() => {
                  info(`CDN download link copied for ${selectedAsset.name}`);
                }}
                className="px-3 py-2 rounded border border-outline-variant text-on-surface-variant hover:text-on-surface flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">link</span>
                Copy CDN URI
              </button>
              <button
                onClick={() => {
                  success(`Asset binary downloaded to local environment.`);
                  setSelectedAsset(null);
                }}
                className="px-4 py-2 rounded bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-bold flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Simulation Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-primary/50 max-w-md w-full rounded p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-title-sm text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">cloud_upload</span>
                Ingest Game Asset
              </h3>
              <button onClick={() => setIsUploadOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="border-2 border-dashed border-border-subtle rounded-lg p-8 text-center bg-surface-container-low mb-6 hover:border-primary transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-4xl text-primary mb-2">upload_file</span>
              <p className="text-xs text-on-surface font-semibold mb-1">
                Drag & drop assets here, or browse
              </p>
              <p className="text-[11px] font-data-mono text-on-surface-variant">
                Supports .FBX, .GLTF, .PNG, .EXR, .WAV (Max 250MB)
              </p>
            </div>

            <div className="flex justify-end gap-3 font-label-caps text-xs">
              <button
                onClick={() => setIsUploadOpen(false)}
                className="px-4 py-2 rounded border border-border-subtle text-on-surface-variant"
              >
                Cancel
              </button>
              <button
                onClick={handleSimulateUpload}
                className="px-4 py-2 bg-primary text-on-primary rounded font-bold hover:bg-primary-container hover:text-on-primary-container"
              >
                Start Ingestion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetsManagerPage;
