import React from 'react';
import { Sheet } from '../kit/Sheet';
import { PrimaryButton as Button } from '../kit';

interface TreasurySurvivedMomentProps {
  isOpen: boolean;
  onClose: () => void;
  finalSpendableMinor: number;
}

export const TreasurySurvivedMoment: React.FC<TreasurySurvivedMomentProps> = ({
  isOpen,
  onClose,
  finalSpendableMinor,
}) => {
  const finalRupees = (finalSpendableMinor / 100).toFixed(2);

  return (
    <Sheet open={isOpen} onClose={onClose} title="⟨ TREASURY SURVIVED ⟩">
      <div className="py-6 text-center space-y-4 font-mono" data-testid="treasury-survived-moment">
        <div className="text-3xl text-[var(--accent-gold,#e8a13c)] font-bold tracking-widest">
          SURVIVED
        </div>

        <div className="text-sm text-[var(--ink-200)]">
          THE TREASURY CYCLE HAS CONCLUDED WITH SURPLUS CAPITAL.
        </div>

        <div className="p-3 bg-[var(--bg-card)] border border-[var(--accent-gold,#e8a13c)]/40 rounded inline-block">
          <div className="text-xs text-[var(--ink-400)]">FINAL REMAINING CAPITAL</div>
          <div className="text-xl font-bold text-[var(--accent-gold,#e8a13c)]">
            ₹{finalRupees}
          </div>
        </div>

        <div className="pt-4">
          <Button onClick={onClose}>
            ACKNOWLEDGE
          </Button>
        </div>
      </div>
    </Sheet>
  );
};
