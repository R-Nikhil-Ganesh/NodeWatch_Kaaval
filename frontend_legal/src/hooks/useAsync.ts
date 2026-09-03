import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/api';

interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
}

/** Runs `fetcher` whenever `deps` changes, guarding against setting state after unmount or stale responses. */
export function useAsync<T>(fetcher: () => Promise<T>, deps: React.DependencyList): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, loading: true, error: null });
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true, error: null }));

    fetcher()
      .then((data) => {
        if (requestId.current === id) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (requestId.current === id) {
          const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
          setState({ data: undefined, loading: false, error: message });
        }
      });

    return () => {
      requestId.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
