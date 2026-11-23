import { jsonObject } from './mapDifficulty';
import type { GameCatalog } from './gameCatalogApi';
import type { ContentBundle, ContentRecord } from './types';

const packs: Record<string, string> = {
  m1_patrol: 'Lính tuần tra', m1_camp_guard: 'Lính gác trại', m1_operation_guard: 'Lính canh điểm nhiệm vụ', m1_commander: 'Túi của chỉ huy',
};
const unused = ['scout', 'heavy'];

export function EnemyDetails({ row, bundle }: { row: ContentRecord; bundle: ContentBundle }) {
  const code = String(row.code), stats = jsonObject(row.fsm_params);
  const itemName = (id: unknown) => String(bundle.items.find(item => item.code === id)?.name ?? id ?? '');
  if (Object.hasOwn(packs, code)) {
    const range = (min: unknown, max: unknown) => typeof min === 'number' && typeof max === 'number' ? `${Math.round(min * 100)}–${Math.round(max * 100)}%` : '—';
    return <section className="my-4 space-y-1 rounded-lg border p-4 text-sm" aria-label="Nguồn Unity">
      <h3 className="font-semibold">Map 1 · {packs[code]}</h3>
      <p>Chọn bảng rơi đồ cho túi lính. Súng rơi theo trang bị thực tế của lính trong Unity.</p>
      <p className="text-muted-foreground">Độ bền súng rơi theo dữ liệu nguồn: {range(stats.drop_min, stats.drop_max)}{stats.sidearm ? ` · ${itemName(stats.sidearm)}: ${range(stats.sidearm_min, stats.sidearm_max)}` : ''}</p>
    </section>;
  }
  const text = code === 'boss_commander' ? 'Chỉ huy trong trận đánh Map 1. HP, tốc độ, tầm nhìn và góc nhìn lấy từ bản publish. Túi rơi đồ dùng mục “Túi của chỉ huy”.'
    : code === 'grunt' ? 'Hồ sơ cơ sở của lính Map 1. Thông số giao chiến hiển thị bên dưới là tham chiếu. Đổi sát thương và tầm phát hiện theo mức ở Maps.'
    : unused.includes(code) ? 'Hồ sơ từ dữ liệu sinh sẵn. Unity hiện không gán hồ sơ này cho các nhóm lính Map 1 hoặc Map 2.'
    : 'Hồ sơ của bản nội dung. Nhóm lính xuất hiện trong game cần được gán trong Unity.';
  return <p className="my-4 rounded-lg border p-4 text-sm text-muted-foreground">{text}</p>;
}

export function MapTwoEnemyReference() {
  return <details className="mb-4 rounded-lg border p-3 text-sm">
    <summary className="cursor-pointer font-semibold">Nhóm địch Map 2 trong Unity</summary>
    <dl className="mt-3 space-y-2 text-muted-foreground">
      <div><dt className="font-medium text-foreground">Ngày 2</dt><dd>Tuần tra và phục kích. Sát thương và tầm phát hiện lấy theo mức trong Maps.</dd></div>
      <div><dt className="font-medium text-foreground">Đêm 2</dt><dd>Đội tuần tra có đèn pha chạy theo kịch bản Unity.</dd></div>
      <div><dt className="font-medium text-foreground">Đêm 3</dt><dd>Đợt tấn công đầu và các đợt lính giữ tuyến lấy độ khó từ Maps. Xe tăng và đội theo kịch bản do Unity quản lý.</dd></div>
    </dl>
  </details>;
}

export function ScriptedWeapons({ catalog }: { catalog?: GameCatalog }) {
  const weapons = catalog?.weapons.filter(weapon => weapon.playable && weapon.scripted) ?? [];
  if (!weapons.length) return null;
  return <section className="mt-5 space-y-2" aria-label="Vũ khí theo kịch bản Unity">
    <h3 className="text-sm font-semibold">Vũ khí theo kịch bản Unity</h3>
    {weapons.map(weapon => <div className="rounded-lg border p-3 text-sm" key={weapon.id}><strong>{weapon.name}</strong><p className="text-muted-foreground">{weapon.id === 'knife' ? 'Cận chiến. Unity xử lý động tác và sát thương của dao.' : 'Thông số do Unity xử lý.'}</p></div>)}
  </section>;
}
