import { TemplateProps, positionStyles } from './types'

export default function SplitTemplate({ imageUrl, headline, bodyText, ctaText, brandColor, width, height, textPosition, showCta, headlineColor, bodyColor, headlineFont, headlineWeight, headlineTransform, bodyFont, bodyWeight, bodyTransform, bgColor, headlineSizeMul, bodySizeMul }: TemplateProps) {
  const pos = positionStyles(textPosition)

  return (
    <div className="flex overflow-hidden" style={{ width, height, fontFamily: bodyFont || 'Barlow, sans-serif' }}>
      <div className="relative" style={{ width: '60%', height: '100%' }}>
        {imageUrl ? (
          <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[#e0e0e0]" />
        )}
      </div>
      <div className="flex flex-col" style={{ width: '40%', padding: '6%', justifyContent: 'center', textAlign: pos.textAlign, background: bgColor }}>
        {headline && (
          <div className="leading-tight mb-[6%]" style={{ fontSize: width * 0.04 * headlineSizeMul, color: headlineColor, fontFamily: headlineFont || undefined, fontWeight: parseInt(headlineWeight), textTransform: headlineTransform as any }}>
            {headline}
          </div>
        )}
        {bodyText && (
          <div className="leading-snug mb-[8%]" style={{ fontSize: width * 0.026 * bodySizeMul, color: bodyColor, fontWeight: parseInt(bodyWeight), textTransform: bodyTransform as any }}>
            {bodyText}
          </div>
        )}
        {showCta && (
          <div className="inline-block font-bold rounded-[6px]"
            style={{ background: brandColor, color: '#000', fontSize: width * 0.026 * bodySizeMul, padding: `${width * 0.012}px ${width * 0.03}px`, alignSelf: pos.alignItems }}>
            {ctaText || 'CTA'}
          </div>
        )}
      </div>
    </div>
  )
}
