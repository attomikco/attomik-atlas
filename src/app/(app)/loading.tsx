export default function Loading() {
  return (
    <div className="p-4 md:p-10 max-w-5xl animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-border/50 rounded-btn" />
        <div className="h-4 w-72 bg-border/30 rounded-btn mt-2" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-paper border border-border rounded-card p-6">
            <div className="h-4 w-4 bg-border/40 rounded mb-4" />
            <div className="h-10 w-16 bg-border/50 rounded-btn" />
            <div className="h-3 w-24 bg-border/30 rounded-btn mt-2" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-paper border border-border rounded-card p-5">
            <div className="h-4 w-full bg-border/30 rounded-btn" />
            <div className="h-4 w-2/3 bg-border/20 rounded-btn mt-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
