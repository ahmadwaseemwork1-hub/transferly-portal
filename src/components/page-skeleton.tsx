export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-48 rounded-md bg-primary-soft" />
        <div className="h-4 w-72 rounded-md bg-primary-soft/60" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-surface p-5">
            <div className="h-3 w-16 rounded bg-primary-soft" />
            <div className="mt-3 h-6 w-12 rounded bg-primary-soft" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="h-4 w-40 rounded bg-primary-soft" />
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-primary-soft/50" />
          ))}
        </div>
      </div>
    </div>
  );
}
