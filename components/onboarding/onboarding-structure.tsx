import { useMemo, useState, type ReactNode } from "react";

type StepHeaderProps = {
  logo: ReactNode;
  stepLabel: string;
  statusLabel: string;
  progress: number;
};

type ProgressBarProps = {
  progress: number;
};

type SectionCardProps = {
  children: ReactNode;
  className?: string;
};

type SelectFieldOption = {
  label: string;
  value: string;
};

type SelectFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  options: SelectFieldOption[];
  onChange: (value: string) => void;
  hint?: string;
  error?: boolean;
  className?: string;
};

type ToggleOption = {
  id: string;
  label: string;
  description?: string;
};

type ToggleGroupProps = {
  label: string;
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

type RadioGroupProps = {
  label: string;
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

type ChipItem = {
  id: string;
  label: string;
};

type ChipListProps = {
  label: string;
  items: ChipItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onAddCustom?: (value: string) => void;
  className?: string;
};

type FooterActionsProps = {
  backLabel: string;
  continueLabel: string;
  onBack: () => void;
  onContinue: () => void;
  disableBack?: boolean;
  disableContinue?: boolean;
};

export function StepHeader({ logo, stepLabel, statusLabel, progress }: StepHeaderProps) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>{logo}</div>
        <p className="text-xs text-slate-500">{statusLabel}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="inline-flex items-center rounded-full border border-[#BFDBFE] bg-[#DBEAFE] px-3 py-1 text-sm font-semibold text-[#1D4ED8]">
            {stepLabel}
          </p>
        </div>
        <ProgressBar progress={progress} />
      </div>
    </div>
  );
}

export function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5EEFF]">
      <div className="h-full rounded-full bg-[linear-gradient(90deg,#2563EB_0%,#60A5FA_100%)] transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
    </div>
  );
}

export function SectionCard({ children, className }: SectionCardProps) {
  return <section className={`rounded-xl border border-black/10 bg-white p-5 ${className ?? ""}`}>{children}</section>;
}

export function SelectField({
  label,
  value,
  placeholder,
  options,
  onChange,
  hint,
  error,
  className,
}: SelectFieldProps) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-semibold text-slate-800">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-12 w-full rounded-lg border bg-white px-4 text-sm text-slate-800 outline-none transition focus:ring-4 ${
          error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-black/10 focus:border-black/25 focus:ring-black/5"
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function ToggleGroup({ label, options, value, onChange, className }: ToggleGroupProps) {
  return (
    <div className={className}>
      <p className="mb-3 text-sm font-semibold text-slate-800">{label}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((option) => {
          const active = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                active ? "border-black/25 bg-blue-50" : "border-black/10 bg-[#FAF7F1] hover:border-black/20 hover:bg-white"
              }`}
            >
              <div className="text-sm font-semibold text-slate-800">{option.label}</div>
              {option.description ? <div className="mt-1 text-xs text-slate-500">{option.description}</div> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RadioGroup({ label, options, value, onChange, className }: RadioGroupProps) {
  return (
    <div className={className}>
      <p className="mb-3 text-sm font-semibold text-slate-800">{label}</p>
      <div className="space-y-3">
        {options.map((option) => {
          const active = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                active ? "border-black/25 bg-blue-50" : "border-black/10 bg-white hover:border-black/20 hover:bg-[#FAF7F1]"
              }`}
            >
              <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${active ? "border-blue-500" : "border-black/25"}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-blue-500" : "bg-transparent"}`} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800">{option.label}</span>
                {option.description ? <span className="mt-1 block text-sm text-slate-500">{option.description}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ChipList({ label, items, selectedIds, onToggle, onAddCustom, className }: ChipListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customValue, setCustomValue] = useState("");

  const itemLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      map.set(item.id, item.label);
    }
    return map;
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => item.label.toLowerCase().includes(query));
  }, [items, search]);

  const selectedChips = useMemo(
    () => selectedIds.map((id) => ({ id, label: itemLabelMap.get(id) ?? id })),
    [itemLabelMap, selectedIds],
  );

  return (
    <div className={className}>
      <p className="mb-3 text-sm font-semibold text-slate-800">{label}</p>

      {selectedChips.length ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => onToggle(chip.id)}
              className="inline-flex items-center gap-1 rounded-full border border-black/20 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
            >
              {chip.label}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-11 w-full items-center justify-between rounded-lg border border-black/15 bg-white px-4 text-sm text-slate-700 transition hover:border-black/25 hover:bg-[#FAF7F1]"
      >
        <span>Seleccionar aficiones (opcional)</span>
        <span className="text-slate-500">{isOpen ? "▴" : "▾"}</span>
      </button>

      {isOpen ? (
        <div className="mt-3 space-y-3 rounded-xl border border-black/10 bg-[#FAF7F1] p-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar aficiones"
            className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm text-slate-700 outline-none focus:border-black/25 focus:ring-2 focus:ring-black/5"
          />

          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {filteredItems.map((item) => {
              const active = selectedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onToggle(item.id)}
                  className="flex w-full items-center justify-between rounded-lg border border-black/10 bg-white px-3 py-2 text-left transition hover:border-black/20 hover:bg-[#FAF7F1]"
                >
                  <span className={`text-sm ${active ? "font-semibold text-slate-900" : "text-slate-700"}`}>{item.label}</span>
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-black/20 text-sm text-slate-600">
                    {active ? "-" : "+"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={customValue}
              onChange={(event) => setCustomValue(event.target.value)}
              placeholder="Añadir otra afición"
              className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm text-slate-700 outline-none focus:border-black/25 focus:ring-2 focus:ring-black/5"
            />
            <button
              type="button"
              onClick={() => {
                const next = customValue.trim();
                if (!next) return;
                onAddCustom?.(next);
                setCustomValue("");
              }}
              className="h-10 rounded-lg border border-black/20 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-black/30 hover:bg-[#FAF7F1]"
            >
              Añadir
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FooterActions({
  backLabel,
  continueLabel,
  onBack,
  onContinue,
  disableBack,
  disableContinue,
}: FooterActionsProps) {
  return (
    <div className="mt-8 flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={onBack}
        disabled={disableBack}
        className="min-h-12 rounded-xl border border-black/20 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-black/30 hover:bg-[#FAF7F1] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {backLabel}
      </button>
      <button
        type="button"
        onClick={onContinue}
        disabled={disableContinue}
        className="min-h-12 rounded-xl bg-[#F87171] px-5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(248,113,113,0.28)] transition hover:bg-[#ef5f5f] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {continueLabel}
      </button>
    </div>
  );
}