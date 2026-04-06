'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'

import OverlayTemplate from '@/components/creatives/templates/OverlayTemplate'
import SplitTemplate from '@/components/creatives/templates/SplitTemplate'
import TestimonialTemplate from '@/components/creatives/templates/TestimonialTemplate'
import StatTemplate from '@/components/creatives/templates/StatTemplate'
import UGCTemplate from '@/components/creatives/templates/UGCTemplate'
import GridTemplate from '@/components/creatives/templates/GridTemplate'
import InfographicTemplate from '@/components/creatives/templates/InfographicTemplate'
import ComparisonTemplate from '@/components/creatives/templates/ComparisonTemplate'
import MissionTemplate from '@/components/creatives/templates/MissionTemplate'

const TEMPLATE_MAP: Record<string, React.ComponentType<any>> = {
  overlay: OverlayTemplate,
  split: SplitTemplate,
  testimonial: TestimonialTemplate,
  stat: StatTemplate,
  ugc: UGCTemplate,
  card: UGCTemplate,
  grid: GridTemplate,
  infographic: InfographicTemplate,
  comparison: ComparisonTemplate,
  mission: MissionTemplate,
}

function RenderContent() {
  const params = useSearchParams()
  const [props, setProps] = useState<any>(null)
  const [fontsReady, setFontsReady] = useState(false)

  const templateId = params.get('template') || 'overlay'
  const width = parseInt(params.get('width') || '1080')
  const height = parseInt(params.get('height') || '1080')
  const propsId = params.get('propsId')

  useEffect(() => {
    if (propsId) {
      fetch(`/api/export/props?id=${propsId}`)
        .then(r => r.json())
        .then(({ props }) => setProps(props))
    }
  }, [propsId])

  // Load brand fonts once props arrive
  useEffect(() => {
    if (!props) return
    const families = [props.headlineFont, props.bodyFont]
      .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
    const unique = Array.from(new Set(families))
    if (unique.length > 0) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      const qs = unique.map(f => f.replace(/ /g, '+')).join('&family=')
      link.href = `https://fonts.googleapis.com/css2?family=${qs}:wght@300;400;500;600;700;800;900&display=swap`
      document.head.appendChild(link)
    }
    // Inject custom @font-face CSS if brand has it
    if (props.customFontsCss) {
      const style = document.createElement('style')
      style.textContent = props.customFontsCss
      document.head.appendChild(style)
    }
    // Wait for all fonts to load before signaling ready
    const finish = () => setFontsReady(true)
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
      ;(document as any).fonts.ready.then(finish).catch(finish)
    } else {
      finish()
    }
    // Safety timeout in case fonts never resolve
    const t = setTimeout(finish, 5000)
    return () => clearTimeout(t)
  }, [props])

  if (!props) return <div style={{ width, height, background: '#fff' }} />

  const TemplateComponent = TEMPLATE_MAP[templateId] || OverlayTemplate

  return (
    <div
      data-fonts-ready={fontsReady ? 'true' : 'false'}
      style={{
        width,
        height,
        overflow: 'hidden',
        position: 'relative',
        margin: 0,
        padding: 0,
      }}
    >
      <TemplateComponent
        {...props}
        width={width}
        height={height}
        isExporting={true}
      />
    </div>
  )
}

export default function RenderPage() {
  return (
    <Suspense>
      <RenderContent />
    </Suspense>
  )
}
