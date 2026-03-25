import { TemplateProps, positionStyles } from './types'

export default function TestimonialTemplate({ imageUrl, headline, bodyText, ctaText, brandColor, width, height, textPosition, showCta, headlineColor, bodyColor, headlineFont, headlineWeight, headlineTransform, bodyFont, bodyWeight, bodyTransform, bgColor, headlineSizeMul, bodySizeMul }: TemplateProps) {
  const pos = positionStyles(textPosition)
  const imgHeight = height * 0.5

  return (
    <div className="flex flex-col overflow-hidden" style={{ width, height, fontFamily: bodyFont || 'Barlow, sans-serif' }}>
      <div className="relative flex-shrink-0" style={{ height: imgHeight }}>
        {imageUrl ? (
          <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[#e0e0e0]" />
        )}
      </div>
      <div className="flex-1 flex flex-col items-center" style={{ padding: '5%', justifyContent: 'center', textAlign: 'center', background: bgColor }}>
        {bodyText && (
          <div className="italic leading-snug mb-[3%]" style={{ fontSize: width * 0.036 * bodySizeMul, color: bodyColor, fontWeight: parseInt(bodyWeight), textTransform: bodyTransform as any }}>
            &ldquo;{bodyText}&rdquo;
          </div>
        )}
        {headline && (
          <div className="leading-tight mb-[2%]" style={{ fontSize: width * 0.028 * headlineSizeMul, color: headlineColor, fontFamily: headlineFont || undefined, fontWeight: parseInt(headlineWeight), textTransform: headlineTransform as any }}>
            {headline}
          </div>
        )}
        {showCta && (
          <div style={{ fontSize: width * 0.024 * bodySizeMul, color: '#999' }}>
            {ctaText || 'CTA'}
          </div>
        )}
      </div>
    </div>
  )
}
