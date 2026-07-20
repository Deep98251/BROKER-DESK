export default function PageHeader({ title, subtitle, action, testid }) {
  return (
    <div className="flex items-start justify-between gap-6 mb-8" data-testid={testid}>
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500 font-bold mb-2">Broker Workspace</div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">{title}</h1>
        {subtitle && <p className="text-stone-600 mt-2 max-w-2xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
