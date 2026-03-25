import { TemplateProps } from './types'

export default function StatTemplate({ imageUrl, headline, bodyText, ctaText, brandColor, width, height }: TemplateProps) {
  return (
    <div className="relative overflow-hidden flex flex-col items-center justify-center" style={{ width, height, fontFamily: 'Barlow, sans-serif' }}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[#e0e0e0]" />
      )}
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 text-center" style={{ padding: '8%' }}>
        {headline && (
          <div className="font-bold leading-none" style={{ fontSize: width * 0.12, color: brandColor }}>
            {headline}
          </div>
        )}
        {bodyText && (
          <div className="text-white/90 leading-snug mt-[3%]" style={{ fontSize: width * 0.035 }}>
            {bodyText}
          </div>
        )}
        {ctaText && (
          <div
            className="inline-block font-bold rounded-[6px] mt-[5%]"
            style={{ background: brandColor, color: '#000', fontSize: width * 0.028, padding: `${width * 0.012}px ${width * 0.03}px` }}
          >
            {ctaText}
          </div>
        )}
      </div>
    </div>
  )
}
