'use client'

import { BarChart, ComposedChart, LineChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { colors, font, fontWeight, radius } from '@/lib/design-tokens'

export interface CreativeSparklineDatum {
  date: string
  spend: number
  revenue: number
  roas: number
}

interface CreativeSparklineProps {
  data: CreativeSparklineDatum[]
  height?: number
  variant?: 'full' | 'minimal' | 'bars'
}

function isDeclining(data: CreativeSparklineDatum[]): boolean {
  if (data.length < 2) return false
  return data[data.length - 1].roas < data[0].roas
}

export default function CreativeSparkline({ data, height = 80, variant = 'minimal' }: CreativeSparklineProps) {
  if (data.length < 2) return null
  const declining = isDeclining(data)
  const lineColor = declining ? colors.dangerSoft : colors.accent

  if (variant === 'minimal') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line
            type="monotone"
            dataKey="roas"
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (variant === 'bars') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }} barCategoryGap="20%" barGap={2}>
          <Bar dataKey="spend" fill={colors.accent} opacity={0.85} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="revenue" fill={colors.border} opacity={0.7} radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="20%" barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
          <XAxis
            dataKey="date"
            tick={{ fontFamily: font.mono, fontSize: 9, fill: colors.muted }}
            tickFormatter={v => { const d = new Date(v + 'T00:00:00'); return `${d.getMonth() + 1}/${d.getDate()}` }}
            stroke={colors.border}
            interval={Math.ceil(data.length / 10) - 1}
            angle={-35}
            textAnchor="end"
            height={40}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontFamily: font.mono, fontSize: 9, fill: colors.muted }}
            tickFormatter={v => { const n = Number(v); return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}` }}
            stroke={colors.border}
            width={46}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontFamily: font.mono, fontSize: 9, fill: colors.gray700 }}
            tickFormatter={v => `${Number(v).toFixed(1)}x`}
            stroke={colors.border}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: colors.ink, border: 'none', borderRadius: radius.lg,
              fontFamily: font.mono, fontSize: 11, color: colors.paper,
            }}
            labelStyle={{ color: colors.accent, fontWeight: fontWeight.bold, marginBottom: 4 }}
            formatter={(value: number, name: string) => {
              if (name === 'roas') return [`${value.toFixed(2)}x`, 'ROAS']
              const label = name === 'spend' ? 'Spend' : 'Revenue'
              return [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, label]
            }}
            labelFormatter={v => { const d = new Date(v + 'T00:00:00'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
          />
          <Bar yAxisId="left" dataKey="spend" fill={colors.accent} opacity={0.85} radius={[3, 3, 0, 0]} />
          <Bar yAxisId="left" dataKey="revenue" fill={colors.border} opacity={0.7} radius={[3, 3, 0, 0]} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="roas"
            stroke={lineColor}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0, fill: lineColor }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 12, height: 8, borderRadius: 2, background: colors.accent, opacity: 0.85 }} />
          <span style={{ fontFamily: font.mono, fontSize: 9, color: colors.muted }}>Spend</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 12, height: 8, borderRadius: 2, background: colors.border, opacity: 0.7 }} />
          <span style={{ fontFamily: font.mono, fontSize: 9, color: colors.muted }}>Revenue</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 16, height: 0, borderTop: `2px dashed ${lineColor}` }} />
          <span style={{ fontFamily: font.mono, fontSize: 9, color: colors.muted }}>ROAS</span>
        </div>
      </div>
    </>
  )
}
