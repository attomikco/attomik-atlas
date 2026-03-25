import { TemplateProps } from './types'

export default function TestimonialTemplate({ imageUrl, headline, bodyText, ctaText, brandColor, width, height }: TemplateProps) {
  const imgHeight = height * 0.5
  return (
    <div className="flex flex-col overflow-hidden" style={{ width, height, fontFamily: 'Barlow, sans-serif', background: '#fff' }}>
      <div className="relative flex-shrink-0" style={{ height: imgHeight }}>
        {imageUrl ? (
          <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[#e0e0e0]" />
        )}
      </div>
      <div className="flex-1 flex flex-col justify-center" style={{ padding: '5%' }}>
        {bodyText && (
          <div className="italic text-black leading-snug mb-[3%]" style={{ fontSize: width * 0.036 }}>
            &ldquo;{bodyText}&rdquo;
          </div>
        )}
        {headline && (
          <div className="font-bold leading-tight mb-[2%]" style={{ fontSize: width * 0.028, color: brandColor }}>
            {headline}
          </div>
        )}
        {ctaText && (
          <div className="text-[#999]" style={{ fontSize: width * 0.024 }}>
            {ctaText}
          </div>
        )}
      </div>
    </div>
  )
}
