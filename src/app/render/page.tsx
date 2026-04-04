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

  if (!props) return <div style={{ width, height, background: '#fff' }} />

  const TemplateComponent = TEMPLATE_MAP[templateId] || OverlayTemplate

  return (
    <div style={{
      width,
      height,
      overflow: 'hidden',
      position: 'relative',
      margin: 0,
      padding: 0,
    }}>
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
