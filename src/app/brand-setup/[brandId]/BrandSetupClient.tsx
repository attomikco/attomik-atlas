'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AttomikLogo from '@/components/ui/AttomikLogo'
import { Brand, BrandImage } from '@/types'
import { CheckCircle } from 'lucide-react'

export default function BrandSetupClient({
  brand: initialBrand,
  brandImages: initialImages,
}: {
  brand: Brand
  brandImages: BrandImage[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const campaignId = searchParams.get('campaign')
  const initialStep = parseInt(searchParams.get('step') || '0')
  const supabase = createClient()

  const [step, setStep] = useState(initialStep)
  const [saving, setSaving] = useState(false)

  // Step 1 fields
  const [name, setName] = useState(initialBrand.name)
  const [mission, setMission] = useState(initialBrand.mission || '')
  const [targetAudience, setTargetAudience] = useState(initialBrand.target_audience || '')
  const [website, setWebsite] = useState(initialBrand.website || '')
  const [logoUrl, setLogoUrl] = useState(initialBrand.logo_url || '')

  // Step 2 fields
  const firstProduct = initialBrand.products?.[0]
  const [productName, setProductName] = useState(firstProduct?.name || '')
  const [price, setPrice] = useState(firstProduct?.price_range || '')
  const [productDesc, setProductDesc] = useState(firstProduct?.description || '')
  const [differentiator, setDifferentiator] = useState('')
  const [keyBenefit, setKeyBenefit] = useState(initialBrand.default_headline || '')

  // Step 3 fields
  const [images, setImages] = useState<BrandImage[]>(initialImages)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Completion
  const [completing, setCompleting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regenStep, setRegenStep] = useState(0)

  // Build image URLs
  useEffect(() => {
    const urls = images.map(img => {
      const cleanPath = img.storage_path.replace(/^brand-images\//, '')
      const { data } = supabase.storage.from('brand-images').getPublicUrl(cleanPath)
      return data.publicUrl
    })
    setImageUrls(urls)
  }, [images])

  async function saveStep1() {
    setSaving(true)
    await supabase.from('brands').update({
      name,
      mission,
      target_audience: targetAudience,
      website,
      logo_url: logoUrl,
    }).eq('id', initialBrand.id)
    setSaving(false)
    setStep(2)
  }

  async function saveStep2() {
    setSaving(true)
    const products = [{
      name: productName,
      description: productDesc,
      price_range: price,
    }]
    await supabase.from('brands').update({
      products,
      default_headline: keyBenefit,
    }).eq('id', initialBrand.id)
    setSaving(false)
    setStep(3)
  }

  async function saveStep3() {
    setStep(4)
    setCompleting(true)

    if (campaignId) {
      setRegenerating(true)
      setRegenStep(0)
      await new Promise(r => setTimeout(r, 600))

      setRegenStep(1)
      try {
        await fetch(`/api/campaigns/${campaignId}/ad-copy`, { method: 'POST' })
      } catch {}

      setRegenStep(2)
      try {
        await fetch(`/api/campaigns/${campaignId}/landing-brief`, { method: 'POST' })
      } catch {}

      setRegenStep(3)
      await new Promise(r => setTimeout(r, 800))

      setRegenStep(4)
      setRegenerating(false)
      await new Promise(r => setTimeout(r, 600))

      router.push(`/creatives?brand=${initialBrand.id}&campaign=${campaignId}`)
    } else {
      setTimeout(() => router.push('/dashboard'), 2500)
    }
  }

  async function handleLogoUpload(file: File) {
    const ext = file.name.split('.').pop() || 'png'
    const path = `${initialBrand.id}/logo_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('brand-images').upload(path, file, { contentType: file.type })
    if (!error) {
      const { data } = supabase.storage.from('brand-images').getPublicUrl(path)
      setLogoUrl(data.publicUrl)
      await supabase.from('brands').update({ logo_url: data.publicUrl }).eq('id', initialBrand.id)
    }
  }

  async function handleImageUpload(files: File[]) {
    setUploading(true)
    for (const file of files) {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${initialBrand.id}/setup_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('brand-images').upload(path, file, { contentType: file.type })
      if (!error) {
        // Guess tag from image dimensions
        const img = new Image()
        const url = URL.createObjectURL(file)
        const tag = await new Promise<string>(resolve => {
          img.onload = () => {
            resolve(img.width > img.height ? 'lifestyle' : 'product')
            URL.revokeObjectURL(url)
          }
          img.onerror = () => { resolve('product'); URL.revokeObjectURL(url) }
          img.src = url
        })

        const { data: inserted } = await supabase.from('brand_images').insert({
          brand_id: initialBrand.id,
          file_name: file.name,
          storage_path: path,
          mime_type: file.type,
          tag,
        }).select().single()

        if (inserted) setImages(prev => [...prev, inserted as BrandImage])
      }
    }
    setUploading(false)
  }

  async function removeImage(index: number) {
    const img = images[index]
    if (!img) return
    await supabase.from('brand_images').delete().eq('id', img.id)
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    border: '2px solid #eee', borderRadius: 12,
    fontSize: 15, fontWeight: 500, color: '#000',
    outline: 'none', background: '#fff',
  }
  const textareaStyle: React.CSSProperties = {
    ...inputStyle, resize: 'vertical',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: '#555',
    letterSpacing: '0.04em', marginBottom: 8, display: 'block',
  }

  // ── STEP 0: WELCOME ──
  if (step === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <AttomikLogo height={36} color="#ffffff" />
        </div>

        <div style={{ textAlign: 'center', maxWidth: 600 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,255,151,0.1)', border: '1px solid rgba(0,255,151,0.25)', borderRadius: 999, padding: '5px 16px', fontSize: 11, fontWeight: 700, color: '#00ff97', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 32 }}>
            ✦ Brand Setup
          </div>

          <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 52, lineHeight: 1.05, letterSpacing: '-0.03em', color: '#fff', marginBottom: 20, textTransform: 'uppercase' }}>
            Let&apos;s make your<br />funnel <span style={{ color: '#00ff97' }}>actually yours.</span>
          </div>

          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 460, margin: '0 auto 40px' }}>
            We built that from your website — which means it&apos;s incomplete. Add your real brand context and we&apos;ll regenerate everything to match.
          </div>

          {/* Progress pills */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 48 }}>
            {[
              { num: '1', label: 'Brand' },
              { num: '2', label: 'Product' },
              { num: '3', label: 'Images' },
            ].map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 999, padding: '8px 18px',
                fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
              }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
                  {p.num}
                </span>
                {p.label}
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep(1)}
            style={{
              background: '#00ff97', color: '#000',
              fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 16,
              padding: '16px 40px', borderRadius: 999,
              border: 'none', cursor: 'pointer',
              marginBottom: 20,
            }}
          >
            Let&apos;s do it →
          </button>

          <div>
            <button
              onClick={() => router.push('/dashboard')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer' }}
            >
              Skip for now, go to dashboard →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── STEP 4: COMPLETION ──
  if (step === 4) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <style>{`
          @keyframes popIn { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
        `}</style>

        <AttomikLogo height={36} color="#ffffff" />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, marginTop: 40 }}>
          {regenStep < 4 ? (
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              border: '2px solid rgba(0,255,151,0.15)',
              borderTop: '2px solid #00ff97',
              animation: 'spin 1s linear infinite',
              flexShrink: 0,
            }} />
          ) : (
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(0,255,151,0.1)', border: '1px solid rgba(0,255,151,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards',
            }}>
              <CheckCircle size={28} color="#00ff97" />
            </div>
          )}

          {regenStep < 4 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 280 }}>
              {[
                { label: 'Saving brand context', done: regenStep > 0 },
                { label: 'Rewriting ad copy', done: regenStep > 1 },
                { label: 'Rebuilding landing page', done: regenStep > 2 },
                { label: 'Finalizing your funnel', done: regenStep > 3 },
              ].map(({ label, done }, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  opacity: regenStep >= i ? 1 : 0.25,
                  transition: 'opacity 0.4s ease',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: done ? '#00ff97' : regenStep === i ? 'rgba(0,255,151,0.2)' : 'rgba(255,255,255,0.1)',
                    border: done ? 'none' : '1px solid rgba(0,255,151,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.3s ease',
                  }}>
                    {done && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {regenStep === i && !done && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff97', animation: 'pulse 1s ease infinite' }} />
                    )}
                  </div>
                  <span style={{
                    fontSize: 14,
                    color: done ? 'rgba(255,255,255,0.9)' : regenStep === i ? '#fff' : 'rgba(255,255,255,0.35)',
                    fontWeight: regenStep === i ? 600 : 400,
                    transition: 'color 0.3s ease',
                  }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 28,
              color: '#fff', textTransform: 'uppercase', textAlign: 'center',
            }}>
              Your funnel is ready.
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── STEPS 1-3 ──
  const stepConfig = [
    null, // 0
    { num: '1 of 3', title: 'YOUR BRAND' },
    { num: '2 of 3', title: 'YOUR HERO PRODUCT' },
    { num: '3 of 3', title: 'YOUR IMAGES' },
  ]
  const current = stepConfig[step]!

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px 120px', position: 'relative' }}>
      {/* Logo */}
      <div style={{ marginBottom: 48 }}>
        <AttomikLogo height={32} color="#ffffff" />
      </div>

      {/* Step indicator */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          {current.num}
        </div>
        <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 28, color: '#fff', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
          {current.title}
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: '#fff', borderRadius: 20,
        padding: '36px 32px', width: '100%',
        maxWidth: step === 3 ? 640 : 560,
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
      }}>
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Logo upload */}
            <div>
              <label style={labelStyle}>Logo</label>
              {logoUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <img src={logoUrl} alt="Logo" style={{ height: 48, maxWidth: 200, objectFit: 'contain' }} />
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#888', cursor: 'pointer', textDecoration: 'underline' }}>
                    Change
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }} />
                  </label>
                </div>
              ) : (
                <label style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '100%', height: 80, borderRadius: 12,
                  border: '2px dashed #ddd', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600, color: '#888',
                }}>
                  + Upload logo
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }} />
                </label>
              )}
            </div>

            <div>
              <label style={labelStyle}>Brand name</label>
              <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Your brand name" />
            </div>

            <div>
              <label style={labelStyle}>What does your brand do? (one line)</label>
              <input style={inputStyle} value={mission} onChange={e => setMission(e.target.value)}
                placeholder="e.g. Non-alcoholic functional drinks for social occasions" />
            </div>

            <div>
              <label style={labelStyle}>Who buys from you?</label>
              <input style={inputStyle} value={targetAudience} onChange={e => setTargetAudience(e.target.value)}
                placeholder="e.g. Health-conscious adults 25-40 who want to socialize without alcohol" />
            </div>

            <div>
              <label style={labelStyle}>Website</label>
              <input style={inputStyle} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourbrand.com" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={labelStyle}>Product name *</label>
              <input style={inputStyle} value={productName} onChange={e => setProductName(e.target.value)} placeholder="Your hero product" />
            </div>

            <div>
              <label style={labelStyle}>Price</label>
              <input style={inputStyle} value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. $29.99" />
            </div>

            <div>
              <label style={labelStyle}>What problem does it solve?</label>
              <textarea style={textareaStyle} rows={3} value={productDesc} onChange={e => setProductDesc(e.target.value)}
                placeholder="e.g. People want to socialize and have a good time without the negative effects of alcohol..." />
            </div>

            <div>
              <label style={labelStyle}>What makes it different?</label>
              <textarea style={textareaStyle} rows={2} value={differentiator} onChange={e => setDifferentiator(e.target.value)}
                placeholder="e.g. Only functional drink with both Lion's Mane AND L-Theanine..." />
            </div>

            <div>
              <label style={labelStyle}>Key benefit (single phrase)</label>
              <input style={inputStyle} value={keyBenefit} onChange={e => setKeyBenefit(e.target.value)}
                placeholder="e.g. Feel the buzz, skip the hangover" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Existing images */}
            {imageUrls.length > 0 && (
              <div>
                <label style={labelStyle}>Current images ({images.length})</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {imageUrls.map((url, i) => (
                    <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: 96, height: 96, borderRadius: 12, overflow: 'hidden', border: '2px solid #eee' }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }} />
                      </div>
                      <button onClick={() => removeImage(i)} style={{
                        position: 'absolute', top: -6, right: -6,
                        width: 20, height: 20, borderRadius: '50%',
                        background: '#000', color: '#fff', border: '2px solid #fff',
                        fontSize: 11, cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 1,
                      }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload zone */}
            <div>
              <label style={labelStyle}>Add images</label>
              <label style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                width: '100%', minHeight: 160, borderRadius: 16,
                border: '2px dashed #ddd', cursor: 'pointer',
                padding: 32, textAlign: 'center',
                transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#999')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#ddd')}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>+</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 4 }}>
                  {uploading ? 'Uploading...' : 'Drop your best product + lifestyle shots here'}
                </div>
                <div style={{ fontSize: 13, color: '#999' }}>
                  Portrait images tagged as product, landscape as lifestyle
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={e => {
                    const files = Array.from(e.target.files || [])
                    if (files.length) handleImageUpload(files)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
        background: 'linear-gradient(to top, #000 60%, transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', maxWidth: 560, justifyContent: 'space-between' }}>
          <button
            onClick={() => setStep(step - 1)}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.4)', fontSize: 14,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            ← Back
          </button>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: s === step ? '#00ff97' : s < step ? '#00ff97' : 'rgba(255,255,255,0.15)',
                opacity: s <= step ? 1 : 0.5,
                transition: 'all 0.2s',
              }} />
            ))}
          </div>

          <button
            onClick={() => {
              if (step === 1) saveStep1()
              else if (step === 2) saveStep2()
              else if (step === 3) saveStep3()
            }}
            disabled={saving || uploading}
            style={{
              background: '#00ff97', color: '#000',
              fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 15,
              padding: '12px 28px', borderRadius: 999,
              border: 'none', cursor: 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : step === 3 ? 'Finish →' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}
