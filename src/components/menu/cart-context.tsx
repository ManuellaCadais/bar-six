'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import type { CartLine } from '@/lib/types';

const STORAGE_KEY = 'six_cart_v1';

interface CartState {
  lines: CartLine[];
  hydrated: boolean;
}

type Action =
  | { type: 'hydrate'; lines: CartLine[] }
  | { type: 'add'; line: CartLine }
  | { type: 'setQty'; lineId: string; quantity: number }
  | { type: 'remove'; lineId: string }
  | { type: 'clear' };

/** Chave de deduplicação: mesmo item + mesmas opções = mesma linha. */
function lineKey(itemId: string, optionIds: string[]): string {
  return `${itemId}|${[...optionIds].sort().join(',')}`;
}

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case 'hydrate':
      return { lines: action.lines, hydrated: true };
    case 'add': {
      const key = lineKey(
        action.line.itemId,
        action.line.options.map((o) => o.optionId),
      );
      const existing = state.lines.find(
        (l) => lineKey(l.itemId, l.options.map((o) => o.optionId)) === key,
      );
      if (existing) {
        return {
          ...state,
          lines: state.lines.map((l) =>
            l.lineId === existing.lineId
              ? { ...l, quantity: l.quantity + action.line.quantity }
              : l,
          ),
        };
      }
      return { ...state, lines: [...state.lines, action.line] };
    }
    case 'setQty':
      return {
        ...state,
        lines: state.lines
          .map((l) =>
            l.lineId === action.lineId
              ? { ...l, quantity: Math.max(0, action.quantity) }
              : l,
          )
          .filter((l) => l.quantity > 0),
      };
    case 'remove':
      return {
        ...state,
        lines: state.lines.filter((l) => l.lineId !== action.lineId),
      };
    case 'clear':
      return { ...state, lines: [] };
    default:
      return state;
  }
}

interface CartContextValue {
  lines: CartLine[];
  hydrated: boolean;
  count: number;
  hasAlcohol: boolean;
  total: number | null;
  add: (line: Omit<CartLine, 'lineId'>) => void;
  setQty: (lineId: string, quantity: number) => void;
  remove: (lineId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function makeLineId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `l_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { lines: [], hydrated: false });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const lines = raw ? (JSON.parse(raw) as CartLine[]) : [];
      dispatch({ type: 'hydrate', lines: Array.isArray(lines) ? lines : [] });
    } catch {
      dispatch({ type: 'hydrate', lines: [] });
    }
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lines));
    } catch {
      /* ignora quota/negação */
    }
  }, [state.lines, state.hydrated]);

  const add = useCallback((line: Omit<CartLine, 'lineId'>) => {
    dispatch({ type: 'add', line: { ...line, lineId: makeLineId() } });
  }, []);
  const setQty = useCallback((lineId: string, quantity: number) => {
    dispatch({ type: 'setQty', lineId, quantity });
  }, []);
  const remove = useCallback((lineId: string) => {
    dispatch({ type: 'remove', lineId });
  }, []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);

  const value = useMemo<CartContextValue>(() => {
    const count = state.lines.reduce((s, l) => s + l.quantity, 0);
    const hasAlcohol = state.lines.some((l) => l.is_alcoholic);
    const allPriced =
      state.lines.length > 0 && state.lines.every((l) => l.price !== null);
    const total = allPriced
      ? state.lines.reduce((s, l) => {
          const opt = l.options.reduce((a, o) => a + o.price_delta, 0);
          return s + ((l.price ?? 0) + opt) * l.quantity;
        }, 0)
      : null;
    return {
      lines: state.lines,
      hydrated: state.hydrated,
      count,
      hasAlcohol,
      total,
      add,
      setQty,
      remove,
      clear,
    };
  }, [state.lines, state.hydrated, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart deve ser usado dentro de <CartProvider>');
  return ctx;
}
