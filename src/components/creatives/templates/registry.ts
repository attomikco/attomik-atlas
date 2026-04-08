import { TextPosition } from './types'
import OverlayTemplate from './OverlayTemplate'
import SplitTemplate from './SplitTemplate'
import TestimonialTemplate from './TestimonialTemplate'
import StatTemplate from './StatTemplate'
import UGCTemplate from './UGCTemplate'
import GridTemplate from './GridTemplate'
export const TEMPLATES = [
  { id: 'overlay',      label: 'Overlay',      component: OverlayTemplate },
  { id: 'split',        label: 'Split',         component: SplitTemplate },
  { id: 'testimonial',  label: 'Testimonial',   component: TestimonialTemplate },
  { id: 'stat',         label: 'Stat',          component: StatTemplate },
  { id: 'ugc',          label: 'Card',          component: UGCTemplate },
  { id: 'grid',         label: 'Grid',          component: GridTemplate },
] as const

export const SIZES = [
  { id: 'feed',      label: '1:1',        w: 1080, h: 1080 },
  { id: 'stories',   label: '9:16',       w: 1080, h: 1920 },
  { id: 'square45',  label: '4:5',        w: 1080, h: 1350 },
]

export const POSITIONS: { pos: TextPosition; i: number }[] = [
  { pos: 'top-left', i: 0 }, { pos: 'top-center', i: 1 }, { pos: 'top-right', i: 2 },
  { pos: 'center', i: 4 },
  { pos: 'bottom-left', i: 6 }, { pos: 'bottom-center', i: 7 }, { pos: 'bottom-right', i: 8 },
]
