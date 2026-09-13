interface TemplateErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function TemplateErrorState({ title = 'Unable to load templates', message, onRetry }: TemplateErrorStateProps) {
  return (
    <div className="rounded-[2rem] border border-rose-500/25 bg-rose-500/10 p-6 text-sm text-rose-100">
      <h3 className="font-bold text-rose-50">{title}</h3>
      <p className="mt-2 leading-6 text-rose-100/80">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-4 rounded-xl border border-rose-300/30 px-4 py-2 text-xs font-semibold text-rose-50 hover:bg-rose-400/10">
          Retry
        </button>
      )}
    </div>
  );
}
