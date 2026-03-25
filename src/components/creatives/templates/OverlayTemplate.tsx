import { TemplateProps } from './types'

export default function OverlayTemplate({ imageUrl, headline, bodyText, ctaText, brandColor, width, height }: TemplateProps) {
  return (
    <div className="relative overflow-hidden" style={{ width, height, fontFamily: 'Barlow, sans-serif' }}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[#e0e0e0]" />
      )}
      <div className="absolute inset-x-0 bottom-0 p-[6%]" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.75))' }}>
        {headline && (
          <div className="font-bold text-white leading-tight mb-[2%]" style={{ fontSize: width * 0.05 }}>
            {headline}
          </div>
        )}
        {bodyText && (
          <div className="text-white/80 leading-snug mb-[3%]" style={{ fontSize: width * 0.032 }}>
            {bodyText}
          </div>
        )}
        {ctaText && (
          <div
            className="inline-block font-bold rounded-[6px]"
            style={{ background: brandColor, color: '#000', fontSize: width * 0.03, padding: `${width * 0.015}px ${width * 0.035}px` }}
          >
            {ctaText}
          </div>
        )}
      </div>
    </div>
  )
}
