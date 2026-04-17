'use client'

import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { colors, font, fontSize, fontWeight, radius } from '@/lib/design-tokens'

export interface MetaTrendChartDatum {
  date: string
  spend: number
  revenue: number
  roas: number
  clicks: number
}

interface MetaTrendChartProps {
  data: MetaTrendChartDatum[]
  height?: number
}

export default function MetaTrendChart({ data, height = 260 }: MetaTrendChartProps) {
  if (data.length <= 1) {
    return (
      <div style={{
        height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: colors.muted, fontFamily: font.mono, fontSize: fontSize.caption,
      }}>
        Not enough daily data to chart
      </div>
    )
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap="20%" barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
          <XAxis
            dataKey="date"
            tick={{ fontFamily: font.mono, fontSize: 10, fill: colors.muted }}
            tickFormatter={v => { const d = new Date(v + 'T00:00:00'); return `${d.getMonth() + 1}/${d.getDate()}` }}
            stroke={colors.border}
            interval={Math.ceil(data.length / 10) - 1}
            angle={-35}
            textAnchor="end"
            height={40}
          />
          {/* Left Y-axis — dollars (Spend + Revenue bars) */}
          <YAxis
            yAxisId="left"
            tick={{ fontFamily: font.mono, fontSize: 10, fill: colors.muted }}
            tickFormatter={v => { const n = Number(v); return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}` }}
            stroke={colors.border}
            width={56}
          />
          {/* Right Y-axis — ROAS ratio */}
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontFamily: font.mono, fontSize: 10, fill: colors.gray700 }}
            tickFormatter={v => `${Number(v).toFixed(1)}x`}
            stroke={colors.border}
            width={44}
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
            stroke={colors.gray700}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0, fill: colors.gray700 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12 }}>
        {[
          { label: 'Spend', type: 'bar' as const, color: colors.accent },
          { label: 'Revenue', type: 'bar' as const, color: colors.border },
          { label: 'ROAS', type: 'line' as const, color: colors.gray700 },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {item.type === 'bar' ? (
              <div style={{ width: 14, height: 10, borderRadius: 2, background: item.color, opacity: item.label === 'Revenue' ? 0.7 : 0.85 }} />
            ) : (
              <div style={{ width: 20, height: 0, borderTop: `2px dashed ${item.color}` }} />
            )}
            <span style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted }}>{item.label}</span>
          </div>
        ))}
      </div>
    </>
  )
}
