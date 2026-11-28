export const num = (value: number | string | null | undefined) => value == null ? '—' : Number(value).toLocaleString('en-GB', { maximumFractionDigits: 2 });
export const pct = (value: number | string | null | undefined) => value == null ? '—' : (Number(value) * 100).toFixed(1) + '%';
export const mapNames: Record<string, string> = { map00_tutorial: 'Tutorial', map01: 'Map 1', map02: 'Map 2' };
export const familyNames: Record<string, string> = { classical: 'Classical', quantum_inspired: 'Quantum-inspired', quantum_hardware: 'Quantum hardware' };
