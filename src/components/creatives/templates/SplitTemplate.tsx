import { TemplateProps } from './types'

export default function SplitTemplate({ imageUrl, headline, bodyText, ctaText, brandColor, width, height }: TemplateProps) {
  return (
    <div className="flex overflow-hidden" style={{ width, height, fontFamily: 'Barlow, sans-serif', background: '#fff' }}>
      <div className="relative" style={{ width: '60%', height: '100%' }}>
        {imageUrl ? (
          <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[#e0e0e0]" />
        )}
      </div>
      <div className="flex flex-col justify-center" style={{ width: '40%', padding: '6%' }}>
        {headline && (
          <div className="font-bold leading-tight text-black mb-[6%]" style={{ fontSize: width * 0.04 }}>
            {headline}
          </div>
        )}
        {bodyText && (
          <div className="text-[#666] leading-snug mb-[8%]" style={{ fontSize: width * 0.026 }}>
            {bodyText}
          </div>
        )}
        {ctaText && (
          <div
            className="inline-block font-bold rounded-[6px] self-start"
            style={{ background: brandColor, color: '#000', fontSize: width * 0.026, padding: `${width * 0.012}px ${width * 0.03}px` }}
          >
            {ctaText}
          </div>
        )}
      </div>
    </div>
  )
}
