export interface PeerSession {
  sessionId?: string; generation?: number; token: string; refreshToken?: string; remember: boolean;
}
export type SessionMessage<T extends PeerSession> =
  | { type: 'query'; sessionId: string }
  | { type: 'rotated'; session: T }
  | { type: 'ended'; sessionId: string };

/** Session storage is copied to an opened tab, but subsequent token rotations are not. */
export function createSessionPeers<T extends PeerSession>(
  read: () => T | null, write: (session: T) => void, clear: () => void,
  send: (message: SessionMessage<T>) => void,
) {
  const waiting = new Set<() => void>();
  return {
    receive(message: SessionMessage<T>) {
      const current = read();
      if (!current || current.remember || !current.sessionId) return;
      if (message.type === 'query') {
        if (message.sessionId === current.sessionId) send({ type: 'rotated', session: current });
      } else if (message.type === 'ended') {
        if (message.sessionId === current.sessionId) { clear(); for (const done of waiting) done(); }
      } else if (message.session?.sessionId === current.sessionId && !message.session.remember &&
        (message.session.generation ?? 0) > (current.generation ?? 0)) {
        write(message.session); for (const done of waiting) done();
      }
    },
    async synchronize() {
      const current = read();
      if (!current || current.remember || !current.sessionId) return;
      await new Promise<void>(resolve => {
        const done = () => { clearTimeout(timer); waiting.delete(done); resolve(); };
        const timer = setTimeout(done, 120);
        waiting.add(done); send({ type: 'query', sessionId: current.sessionId! });
      });
    },
  };
}
