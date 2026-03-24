export default function BrandsLoading() {
  return (
    <div className="p-4 md:p-10 max-w-5xl animate-pulse">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <div className="h-8 w-32 bg-border/50 rounded-btn" />
          <div className="h-4 w-20 bg-border/30 rounded-btn mt-2" />
        </div>
        <div className="h-10 w-28 bg-accent/30 rounded-btn" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-paper border border-border rounded-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-border/40 rounded-btn" />
              <div>
                <div className="h-5 w-28 bg-border/50 rounded-btn" />
                <div className="h-3 w-16 bg-border/30 rounded-btn mt-1.5" />
              </div>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3].map(j => (
                <div key={j} className="h-5 w-16 bg-border/20 rounded-pill" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
