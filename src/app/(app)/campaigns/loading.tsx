export default function CampaignsLoading() {
  return (
    <div className="p-4 md:p-10 max-w-5xl animate-pulse">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <div className="h-8 w-40 bg-border/50 rounded-btn" />
          <div className="h-4 w-24 bg-border/30 rounded-btn mt-2" />
        </div>
        <div className="h-10 w-32 bg-accent/30 rounded-btn" />
      </div>

      <div className="bg-paper border border-border rounded-card overflow-hidden">
        <div className="bg-cream px-6 py-3 flex gap-16">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-3 w-16 bg-border/40 rounded-btn" />
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="px-6 py-4 border-t border-border flex items-center gap-16">
            <div className="h-4 w-32 bg-border/30 rounded-btn" />
            <div className="h-4 w-20 bg-border/20 rounded-btn" />
            <div className="h-4 w-16 bg-border/20 rounded-btn" />
            <div className="h-5 w-16 bg-border/20 rounded-pill" />
            <div className="h-4 w-12 bg-border/20 rounded-btn" />
          </div>
        ))}
      </div>
    </div>
  )
}
