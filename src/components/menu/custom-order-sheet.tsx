'use client';

import { useEffect, useState } from 'react';
import { useCart } from './cart-context';

const MAX_LEN = 240;

export function CustomOrderSheet({ onClose }: { onClose: () => void }) {
  const { add } = useCart();
  const [text, setText] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const trimmed = text.trim();
  const canAdd = trimmed.length >= 2;

  function confirm() {
    if (!canAdd) return;
    add({
      itemId: crypto.randomUUID(),
      name: trimmed,
      price: null,
      quantity,
      is_alcoholic: false,
      options: [],
      isCustom: true,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Personalizar pedido"
    >
      <button
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-lg max-h-[88dvh] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-surface border border-hairline shadow-soft animate-slide-in flex flex-col">
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/15 sm:hidden" />

        <header className="px-6 pt-4 pb-4 border-b border-hairline">
          <h2 className="font-heading text-xl uppercase tracking-wide text-text-hi">
            Personalize seu pedido
          </h2>
          <p className="mt-1.5 text-sm text-text-mid leading-relaxed">
            Não achou o que quer no cardápio? Descreva aqui — um shake do seu jeito,
            água, isotônico, energético, o que for. O bar lê e prepara.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="field-label" htmlFor="custom-text">
              O que você quer?
            </label>
            <textarea
              id="custom-text"
              className="field-input resize-none"
              rows={4}
              placeholder="Ex.: Whey de baunilha com leite de amêndoas e canela. Ou: uma água mineral gelada."
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
              autoFocus
            />
            <p className="mt-1 text-right text-xs text-text-low">
              {text.length}/{MAX_LEN}
            </p>
          </div>

          <p className="text-xs text-text-mid leading-relaxed border-l-2 border-hairline-strong pl-3">
            Se for bebida alcoólica, vale a mesma regra do cardápio: consumo
            permitido só para maiores de 18 anos, sujeito à disponibilidade do bar
            no momento.
          </p>
        </div>

        <footer className="px-6 py-4 border-t border-hairline flex items-center gap-3 bg-surface">
          <div className="flex items-center rounded-full border border-hairline-strong">
            <button
              className="h-11 w-11 grid place-items-center text-xl text-text-hi disabled:opacity-30"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Diminuir quantidade"
            >
              −
            </button>
            <span className="w-8 text-center font-heading text-lg tabular-nums">
              {quantity}
            </span>
            <button
              className="h-11 w-11 grid place-items-center text-xl text-text-hi"
              onClick={() => setQuantity((q) => Math.min(30, q + 1))}
              aria-label="Aumentar quantidade"
            >
              +
            </button>
          </div>
          <button className="btn-primary flex-1 py-3.5" onClick={confirm} disabled={!canAdd}>
            {canAdd ? 'Adicionar ao pedido' : 'Escreva o que você quer'}
          </button>
        </footer>
      </div>
    </div>
  );
}
