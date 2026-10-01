import React, { useState, useEffect } from 'react';
import { Sheet } from '../kit/Sheet';
import { getTreasuryLedger } from '../../store/treasury';
import type { TreasuryLedgerRow } from '../../engine/treasury';

interface TreasuryHistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TreasuryHistorySheet: React.FC<TreasuryHistorySheetProps> = ({
  isOpen,
  onClose,
}) => {
  const [ledger, setLedger] = useState<TreasuryLedgerRow[]>([]);
  const [page, setPage] = useState(0);
  const pageSize = 7;

  useEffect(() => {
    if (isOpen) {
      getTreasuryLedger().then((res) => {
        setLedger(res);
        setPage(0);
      });
    }
  }, [isOpen]);

  const totalPages = Math.max(1, Math.ceil(ledger.length / pageSize));
  const currentRows = ledger.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <Sheet open={isOpen} onClose={onClose} title="⟨ TREASURY LEDGER ⟩">
      <div className="space-y-3 text-xs" data-testid="treasury-history-sheet">
        {ledger.length === 0 ? (
          <div className="text-[var(--ink-400)] text-center py-4">No ledger history available.</div>
        ) : (
          <div className="space-y-2">
            {currentRows.map((row) => {
              const allowanceStr = row.allowanceMinor !== null ? (row.allowanceMinor / 100).toFixed(2) : '—';
              const spentStr = row.spentMinor !== null ? (row.spentMinor / 100).toFixed(2) : '—';
              const preservedStr = row.preservedMinor !== null ? (row.preservedMinor / 100).toFixed(2) : null;
              const overStr = row.overMinor !== null ? (row.overMinor / 100).toFixed(2) : null;

              return (
                <div
                  key={row.localDate}
                  className="p-2.5 bg-[var(--bg-card)] border border-[var(--ink-800)] rounded flex flex-col gap-1"
                >
                  <div className="flex justify-between items-center font-mono font-bold text-[11px] text-[var(--ink-200)]">
                    <span>{row.localDate}</span>
                    <span className="text-[10px] uppercase text-[var(--accent-mana,#4da3ff)]">
                      {row.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[11px] text-[var(--ink-400)] font-mono">
                    <div>
                      <span>ALLOWANCE: </span>
                      <span className="text-[var(--ink-200)]">₹{allowanceStr}</span>
                    </div>
                    <div>
                      <span>SPENT: </span>
                      <span className="text-[var(--ink-200)]">₹{spentStr}</span>
                    </div>
                    <div>
                      {preservedStr !== null && (
                        <span className="text-[var(--state-complete,#4ade80)]">
                          PRESERVED ₹{preservedStr}
                        </span>
                      )}
                      {overStr !== null && (
                        <span className="text-[var(--state-recover,#f59e0b)]">
                          OVER ₹{overStr}
                        </span>
                      )}
                      {preservedStr === null && overStr === null && (
                        <span>UNACCOUNTED</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination Controls */}
            <div className="flex justify-between items-center pt-2 font-mono text-xs text-[var(--ink-400)]">
              <span>
                PAGE {page + 1} OF {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--ink-700)] disabled:opacity-40"
                >
                  PREV
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--ink-700)] disabled:opacity-40"
                >
                  NEXT
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
};
