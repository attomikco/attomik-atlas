export default function BrandDetailLoading() {
  return (
    <div className="p-4 md:p-10 max-w-6xl animate-pulse">
      {/* Back link */}
      <div className="h-4 w-20 bg-border/30 rounded-btn mb-6" />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6 md:mb-8">
        <div className="w-10 h-10 md:w-14 md:h-14 bg-border/40 rounded-card" />
        <div>
          <div className="h-8 w-40 bg-border/50 rounded-btn" />
          <div className="h-4 w-24 bg-border/30 rounded-btn mt-1.5" />
        </div>
      </div>

      {/* Voice editor skeleton */}
      <div className="bg-paper border border-border rounded-card p-6 mb-6">
        <div className="h-4 w-36 bg-border/40 rounded-btn mb-5" />
        <div className="space-y-4">
          <div className="h-10 w-full bg-border/20 rounded-btn" />
          <div className="h-20 w-full bg-border/20 rounded-btn" />
          <div className="h-16 w-full bg-border/20 rounded-btn" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-border/20 rounded-btn" />
            <div className="h-10 bg-border/20 rounded-btn" />
          </div>
        </div>
      </div>

      {/* Assets row skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-paper border border-border rounded-card p-5">
            <div className="h-3 w-28 bg-border/40 rounded-btn mb-3" />
            <div className="h-12 w-full bg-border/15 rounded-btn border border-dashed border-border" />
          </div>
        ))}
      </div>

      {/* Profile + examples skeletons */}
      <div className="bg-paper border border-border rounded-card p-6 mb-6">
        <div className="h-4 w-28 bg-border/40 rounded-btn mb-5" />
        <div className="h-10 w-full bg-border/20 rounded-btn" />
      </div>
      <div className="bg-paper border border-border rounded-card p-6">
        <div className="h-4 w-28 bg-border/40 rounded-btn mb-5" />
        <div className="h-10 w-full bg-border/20 rounded-btn" />
      </div>
    </div>
  )
}
