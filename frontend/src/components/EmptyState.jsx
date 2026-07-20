import { Inbox } from "lucide-react";

export default function EmptyState({ title = "Nothing here yet", description, action, icon: Icon = Inbox }) {
  return (
    <div className="card-flat p-12 flex flex-col items-start gap-3" data-testid="empty-state">
      <div className="w-11 h-11 rounded-md surface-muted flex items-center justify-center text-stone-500">
        <Icon size={20} strokeWidth={1.5} />
      </div>
      <div className="font-display font-semibold text-lg text-stone-800">{title}</div>
      {description && <div className="text-stone-600 max-w-md text-sm">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
