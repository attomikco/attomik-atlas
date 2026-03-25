import { TemplateProps } from './types'

export default function UGCTemplate({ imageUrl, headline, bodyText, ctaText, brandColor, width, height }: TemplateProps) {
  return (
    <div className="relative overflow-hidden" style={{ width, height, fontFamily: 'Barlow, sans-serif' }}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[#e0e0e0]" />
      )}
      <div className="absolute top-0 left-0 right-0" style={{ padding: '5%' }}>
        {headline && (
          <div
            className="inline-block font-bold leading-tight rounded-[4px]"
            style={{ fontSize: width * 0.035, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: `${width * 0.01}px ${width * 0.02}px` }}
          >
            {headline}
          </div>
        )}
        {bodyText && (
          <div
            className="inline-block leading-snug rounded-[4px] mt-[1.5%]"
            style={{ fontSize: width * 0.026, color: '#fff', background: 'rgba(0,0,0,0.4)', padding: `${width * 0.008}px ${width * 0.016}px` }}
          >
            {bodyText}
          </div>
        )}
      </div>
      {ctaText && (
        <div className="absolute bottom-0 right-0" style={{ padding: '5%' }}>
          <div
            className="font-bold rounded-[6px]"
            style={{ background: brandColor, color: '#000', fontSize: width * 0.026, padding: `${width * 0.01}px ${width * 0.025}px` }}
          >
            {ctaText}
          </div>
        </div>
      )}
    </div>
  )
}
