export function createRefreshCoordinator<T extends { token: string; refreshToken?: string }>(
  read: () => T | null, write: (session: T) => void,
  rotate: (session: T) => Promise<T>, lock: <R>(job: () => Promise<R>) => Promise<R>,
) {
  let pending: Promise<T> | undefined;
  return (failedToken: string): Promise<T> => {
    if (!pending) pending = lock(async () => {
      const current = read();
      if (!current) throw new Error('Your session has ended.');
      if (current.token !== failedToken) return current;
      if (!current.refreshToken) throw new Error('Please sign in again.');
      const next = await rotate(current);
      if (read()?.refreshToken !== current.refreshToken) throw new Error('Session changed while refreshing.');
      write(next); return next;
    }).finally(() => { pending = undefined; });
    return pending;
  };
}
