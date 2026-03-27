'use client'
import { useState } from 'react'
import { Brand } from '@/types'

interface Creative {
  imageUrl: string | null
  headline: string
  primaryText: string
  ctaText: string
}

interface PlatformAdPreviewProps {
  brand: Brand
  creative: Creative
  TemplateComponent: React.ComponentType<any>
  templateProps: Record<string, any>
  defaultPlatform?: 'facebook' | 'instagram' | 'story'
}

const sysFont = '-apple-system, "Helvetica Neue", Arial, sans-serif'
const FRAME_W = 340

function FacebookFrame({ brand, creative, TemplateComponent, templateProps }: PlatformAdPreviewProps) {
  const accent = brand.primary_color || '#1877f2'
  const scale = FRAME_W / 1080
  return (
    <div style={{ width: FRAME_W, fontFamily: sysFont, background: '#fff', borderRadius: 12, border: '1px solid #ddd', overflow: 'hidden' }}>
      <div style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{brand.name?.[0] || 'B'}</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#050505' }}>{brand.name}</div>
          <div style={{ fontSize: 11, color: '#65676b' }}>Sponsored · 🌐</div>
        </div>
        <div style={{ marginLeft: 'auto', color: '#65676b', fontSize: 16 }}>···</div>
      </div>
      <div style={{ padding: '0 10px 8px', fontSize: 12, color: '#050505', lineHeight: 1.34 }}>
        {creative.primaryText.slice(0, 100)}{creative.primaryText.length > 100 && '...'}
      </div>
      <div style={{ width: FRAME_W, height: FRAME_W, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: 1080, height: 1080, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <TemplateComponent {...templateProps} width={1080} height={1080} />
        </div>
      </div>
      <div style={{ padding: '6px 10px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#050505', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{creative.headline}</div>
        <div style={{ borderRadius: 4, padding: '5px 10px', background: '#e4e6eb', color: '#050505', fontWeight: 600, fontSize: 12 }}>{creative.ctaText || 'Shop Now'}</div>
      </div>
      <div style={{ padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#65676b' }}>
        <span>👍 ❤️ 1.2K</span>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontWeight: 600 }}>Comment</span>
          <span style={{ fontWeight: 600 }}>Share</span>
        </div>
      </div>
    </div>
  )
}

function InstagramFrame({ brand, creative, TemplateComponent, templateProps }: PlatformAdPreviewProps) {
  const accent = brand.primary_color || '#e4405f'
  const scale = FRAME_W / 1080
  return (
    <div style={{ width: FRAME_W, fontFamily: sysFont, background: '#fff' }}>
      <div style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)', padding: 2, flexShrink: 0 }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 9 }}>{brand.name?.[0] || 'B'}</span>
          </div>
        </div>
        <span style={{ fontWeight: 600, fontSize: 13, color: '#262626' }}>{brand.name}</span>
        <span style={{ fontSize: 11, color: '#8e8e8e', marginLeft: 2 }}>Sponsored</span>
        <div style={{ marginLeft: 'auto', color: '#262626', fontSize: 14 }}>···</div>
      </div>
      <div style={{ width: FRAME_W, height: FRAME_W, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: 1080, height: 1080, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <TemplateComponent {...templateProps} width={1080} height={1080} />
        </div>
      </div>
      <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20 }}>♡</span><span style={{ fontSize: 20 }}>💬</span><span style={{ fontSize: 20 }}>📤</span>
        <span style={{ marginLeft: 'auto', fontSize: 20 }}>🔖</span>
      </div>
      <div style={{ padding: '0 10px 4px', fontWeight: 600, fontSize: 13, color: '#262626' }}>2,451 likes</div>
      <div style={{ padding: '0 10px 6px', fontSize: 13, color: '#262626' }}>
        <span style={{ fontWeight: 600 }}>{brand.name}</span> {creative.primaryText.slice(0, 60)}...
      </div>
      <div style={{ margin: '0 10px 8px', padding: 10, borderRadius: 8, background: '#fafafa', border: '1px solid #dbdbdb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#262626', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{creative.headline}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#0095f6' }}>{creative.ctaText || 'Shop Now'}</span>
      </div>
    </div>
  )
}

function StoryFrame({ brand, creative, TemplateComponent, templateProps }: PlatformAdPreviewProps) {
  const storyW = 220
  const storyH = Math.round(storyW * 16 / 9)
  const scale = storyW / 1080
  return (
    <div style={{ width: storyW, height: storyH, position: 'relative', overflow: 'hidden', borderRadius: 14, background: '#000', margin: '0 auto' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 1080, height: 1920, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <TemplateComponent {...templateProps} width={1080} height={1920} />
      </div>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 10, zIndex: 10 }}>
        <div style={{ width: '100%', height: 2, background: 'rgba(255,255,255,0.3)', borderRadius: 1, marginBottom: 8 }}>
          <div style={{ width: '33%', height: '100%', background: '#fff', borderRadius: 1 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700 }}>{brand.name?.[0] || 'B'}</div>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>{brand.name}</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>Sponsored</span>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, zIndex: 10, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}>
        <div style={{ width: '100%', padding: '10px 0', borderRadius: 9999, background: '#fff', textAlign: 'center', fontWeight: 600, fontSize: 12, color: '#262626', marginBottom: 6 }}>
          ↑ {creative.ctaText || 'Shop Now'}
        </div>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Swipe up</div>
      </div>
    </div>
  )
}

export default function PlatformAdPreview(props: PlatformAdPreviewProps) {
  const [platform, setPlatform] = useState<'facebook' | 'instagram' | 'story'>(props.defaultPlatform || 'facebook')
  const hideSwitch = !!props.defaultPlatform

  return (
    <div>
      {!hideSwitch && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, justifyContent: 'center' }}>
          {(['facebook', 'instagram', 'story'] as const).map(p => (
            <button key={p} onClick={() => setPlatform(p)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
              style={platform === p ? { background: '#111', color: '#fff', borderColor: '#111' } : { borderColor: '#ddd', color: '#888' }}>
              {p === 'facebook' ? '📘 Facebook' : p === 'instagram' ? '📷 Instagram' : '◻ Story'}
            </button>
          ))}
        </div>
      )}
      {platform === 'facebook' && <FacebookFrame {...props} />}
      {platform === 'instagram' && <InstagramFrame {...props} />}
      {platform === 'story' && <StoryFrame {...props} />}
    </div>
  )
}
