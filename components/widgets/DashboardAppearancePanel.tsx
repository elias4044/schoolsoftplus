'use client';

import { Check } from 'lucide-react';

import {
  DASHBOARD_ACCENTS,
  DASHBOARD_DENSITIES,
  DEFAULT_DASHBOARD_APPEARANCE,
  type DashboardAppearance,
} from '@/lib/widgets/types';
import { Button } from '@/components/ui/button';

const accentLabels = {
  theme: 'App theme',
  lagoon: 'Lagoon',
  orchid: 'Orchid',
  coral: 'Coral',
  gold: 'Gold',
};
const densityLabels = { compact: 'Compact', comfortable: 'Comfortable', spacious: 'Spacious' };

export function DashboardAppearancePanel({
  appearance,
  onChange,
}: {
  appearance: DashboardAppearance;
  onChange: (patch: Partial<DashboardAppearance>) => void;
}) {
  const defaults = DEFAULT_DASHBOARD_APPEARANCE;
  const canReset =
    appearance.accent !== defaults.accent ||
    appearance.density !== defaults.density ||
    appearance.showPlanner !== defaults.showPlanner;
  return (
    <div id="dashboard-appearance" className="appearancePanel">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Dashboard color</legend>
        <div className="flex flex-wrap gap-1.5">
          {DASHBOARD_ACCENTS.map((accent) => (
            <label key={accent} className="appearanceChoice">
              <input
                className="peer sr-only"
                type="radio"
                name="dashboard-accent"
                checked={appearance.accent === accent}
                onChange={() => onChange({ accent })}
              />
              <span>
                <span className="accentSwatch" data-swatch={accent}>
                  <Check aria-hidden className="size-3" />
                </span>
                {accentLabels[accent]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Widget spacing</legend>
        <div className="flex flex-wrap gap-1.5">
          {DASHBOARD_DENSITIES.map((density) => (
            <label key={density} className="appearanceChoice">
              <input
                className="peer sr-only"
                type="radio"
                name="dashboard-density"
                checked={appearance.density === density}
                onChange={() => onChange({ density })}
              />
              <span>{densityLabels[density]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-x-3 @min-[38rem]:col-span-2">
        <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-(--dashboard-color)"
            checked={appearance.showPlanner}
            onChange={(event) => onChange({ showPlanner: event.target.checked })}
          />
          Show school-week planner
        </label>
        {canReset && (
          <Button variant="ghost" className="min-h-11" onClick={() => onChange(defaults)}>
            Reset appearance
          </Button>
        )}
      </div>
    </div>
  );
}
