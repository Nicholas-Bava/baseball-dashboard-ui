// src/components/player/CareerDistributionChart.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { getStatDistribution } from '../../api/baseballApi'
import './CareerDistributionChart.css'

const AVAILABLE_STATS = [
    { key: 'homeRuns',    label: 'Home Runs' },
    { key: 'avg',         label: 'Batting Average' },
    { key: 'rbi',         label: 'RBI' },
    { key: 'ops',         label: 'OPS' },
    { key: 'hits',        label: 'Hits' },
    { key: 'stolenBases', label: 'Stolen Bases' },
    { key: 'baseOnBalls', label: 'Walks' },
    { key: 'woba',        label: 'wOBA' },
]

const RATE_STATS = ['avg', 'obp', 'slg', 'ops', 'woba']
const ALL_SEASONS = Array.from({ length: 36 }, (_, i) => 1990 + i)

// Silverman's rule of thumb bandwidth
const silvermanBandwidth = (values) => {
    const n = values.length
    if (n < 2) return 1
    const mean = values.reduce((a, b) => a + b, 0) / n
    const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n)
    return 1.06 * std * Math.pow(n, -0.2)
}

// Gaussian KDE density at a point
const kernelDensity = (value, dataPoints, bandwidth) => {
    const h = bandwidth
    return dataPoints.reduce((sum, v) => {
        const z = (value - v) / h
        return sum + Math.exp(-0.5 * z * z)
    }, 0) / (dataPoints.length * h * Math.sqrt(2 * Math.PI))
}

function CareerDistributionChart({ batting, playerName, selectedStat, onStatChange }) {
    const [distributionData, setDistributionData] = useState(null)
    const [loading, setLoading] = useState(false)

    const containerRef = useRef(null)
    const canvasRef = useRef(null)
    const [containerWidth, setContainerWidth] = useState(0)

    const MARGIN = { top: 20, right: 20, bottom: 30, left: 52 }
    const HEIGHT = 380

    const sortedBatting = [...batting].sort((a, b) => a.season - b.season)
    const playerSeasons = new Map(sortedBatting.map(s => [s.season, s]))

    // ── ResizeObserver ────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current) return
        const observer = new ResizeObserver(entries => {
            const width = entries[0].contentRect.width
            if (width > 0) setContainerWidth(width)
        })
        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [])

    // ── Fetch distribution data ───────────────────────────────────────
    useEffect(() => {
        let ignore = false
        setLoading(true)

        getStatDistribution(selectedStat, ALL_SEASONS)
            .then(res => {
                if (!ignore) {
                    setDistributionData(res.data)
                    setLoading(false)
                }
            })
            .catch(() => { if (!ignore) setLoading(false) })

        return () => { ignore = true }
    }, [selectedStat])

    // Heat map color scale: transparent → yellow → orange → red
    const densityToColor = (normalized) => {
        if (normalized < 0.04) return [0, 0, 0, 0]
        const t = Math.pow(normalized, 0.55)

        if (t < 0.2) {
            // very sparse: cool purple
            const tt = t / 0.2
            return [120, 60, Math.round(180 + tt * 40), Math.round(tt * 80)]
        } else if (t < 0.4) {
            // sparse: blue to cyan
            const tt = (t - 0.2) / 0.2
            return [Math.round(60 + tt * 0), Math.round(100 + tt * 120), 220, Math.round(80 + tt * 60)]
        } else if (t < 0.6) {
            // medium: cyan to yellow-green
            const tt = (t - 0.4) / 0.2
            return [Math.round(tt * 200), Math.round(220 - tt * 20), Math.round(220 - tt * 180), Math.round(140 + tt * 40)]
        } else if (t < 0.8) {
            // dense: yellow to orange
            const tt = (t - 0.6) / 0.2
            return [230, Math.round(200 - tt * 120), 0, Math.round(180 + tt * 20)]
        } else {
            // very dense: orange to deep red
            const tt = (t - 0.8) / 0.2
            return [Math.round(230 - tt * 30), Math.round(80 - tt * 60), 0, 220]
        }
    }

    // ── Paint canvas ──────────────────────────────────────────────────
    const paintCanvas = useCallback(() => {
        if (!canvasRef.current || !distributionData || containerWidth === 0) return

        const canvas = canvasRef.current
        const W = Math.floor(containerWidth)
        const PLOT_W = W - MARGIN.left - MARGIN.right
        const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom

        canvas.width = Math.floor(W)
        canvas.height = HEIGHT
        canvas.style.width = Math.floor(W) + 'px'
        canvas.style.height = HEIGHT + 'px'

        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, W, HEIGHT)

        // Compute Y range from all league values
        const allValues = Object.values(distributionData).flat().filter(v => !isNaN(v))
        if (!allValues.length) return

        const sorted = [...allValues].sort((a, b) => a - b)
        const p1  = sorted[Math.floor(sorted.length * 0.01)]
        const p99 = sorted[Math.floor(sorted.length * 0.99)]
        const pad = (p99 - p1) * 0.08
        const yMin = p1 - pad
        const yMax = p99 + pad

        // Pre-compute KDE for each season
        const seasonKDEs = {}
        let globalMaxDensity = 0

        ALL_SEASONS.forEach(season => {
            const values = (distributionData[String(season)] || []).filter(v => !isNaN(v))
            if (!values.length) return

            const bw = silvermanBandwidth(values)
            const densities = []

            for (let py = 0; py < PLOT_H; py++) {
                const statVal = yMax - (py / PLOT_H) * (yMax - yMin)
                const density = kernelDensity(statVal, values, bw)
                densities.push(density)
                if (density > globalMaxDensity) globalMaxDensity = density
            }

            seasonKDEs[String(season)] = densities
        })

        if (globalMaxDensity === 0) return

        // Create image buffer
        // Paint pixel by pixel with season interpolation for smooth gradients
        const imageData = ctx.createImageData(W, HEIGHT)
        const data = imageData.data

        for (let px = 0; px < PLOT_W; px++) {
            // Interpolate between adjacent seasons
            const seasonIndex = (px / (PLOT_W - 1)) * (ALL_SEASONS.length - 1)
            const s1 = Math.floor(seasonIndex)
            const s2 = Math.min(s1 + 1, ALL_SEASONS.length - 1)
            const t = seasonIndex - s1

            const dens1 = seasonKDEs[String(ALL_SEASONS[s1])]
            const dens2 = seasonKDEs[String(ALL_SEASONS[s2])]
            if (!dens1 && !dens2) continue

            for (let py = 0; py < PLOT_H; py++) {
                const d1 = dens1 ? dens1[py] : 0
                const d2 = dens2 ? dens2[py] : 0
                const density = d1 * (1 - t) + d2 * t
                const normalized = density / globalMaxDensity

                if (normalized < 0.05) continue

                const [r, g, b, a] = densityToColor(normalized)
                const canvasX = MARGIN.left + px
                const canvasY = MARGIN.top + py
                const idx = (canvasY * W + canvasX) * 4

                data[idx]     = r
                data[idx + 1] = g
                data[idx + 2] = b
                data[idx + 3] = a
            }
        }

        ctx.putImageData(imageData, 0, 0)

    }, [distributionData, containerWidth, selectedStat])

    // Repaint when data or size changes
    useEffect(() => {
        paintCanvas()
    }, [paintCanvas])

    // ── SVG overlay calculations ──────────────────────────────────────
    const W = containerWidth || 600
    const PLOT_W = W - MARGIN.left - MARGIN.right
    const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom

    const allValues = distributionData
        ? Object.values(distributionData).flat().filter(v => !isNaN(v))
        : []

    const sorted = allValues.length ? [...allValues].sort((a, b) => a - b) : []
    const p1  = sorted.length ? sorted[Math.floor(sorted.length * 0.01)] : 0
    const p99 = sorted.length ? sorted[Math.floor(sorted.length * 0.99)] : 1
    const pad = sorted.length ? (p99 - p1) * 0.08 : 0
    const yMin = sorted.length ? p1 - pad : 0
    const yMax = sorted.length ? p99 + pad : 1

    const toSvgX = (seasonIndex) =>
        MARGIN.left + (seasonIndex / (ALL_SEASONS.length - 1)) * PLOT_W

    const toSvgY = (val) =>
        MARGIN.top + PLOT_H - ((val - yMin) / (yMax - yMin)) * PLOT_H

    // Player dots
    const playerDots = ALL_SEASONS.map((season, i) => {
        const s = playerSeasons.get(season)
        if (!s) return null
        const val = parseFloat(s[selectedStat])
        if (isNaN(val)) return null
        return { x: toSvgX(i), y: toSvgY(val), season, value: val }
    }).filter(Boolean)

    const linePoints = playerDots.map(d => `${d.x},${d.y}`).join(' ')

    // Y axis ticks
    const yTicks = Array.from({ length: 7 }, (_, i) => {
        const val = yMin + (i / 6) * (yMax - yMin)
        return { val, y: toSvgY(val) }
    })

    const formatTick = (val) =>
        RATE_STATS.includes(selectedStat)
            ? val.toFixed(3).replace('0.', '.')
            : Math.round(val)

    // X axis labels — every 5 years
    const xLabels = ALL_SEASONS
        .map((s, i) => ({ season: s, i }))
        .filter(({ season }) => season % 5 === 0)

    return (
        <div className="dist-chart-container" ref={containerRef}>
            {loading && (
                <div className="dist-loading">Loading...</div>
            )}

            {/* Stacked canvas + SVG */}
            <div className="dist-chart-inner" style={{ height: HEIGHT }}>

                {/* Canvas — heatmap pixels */}
                <canvas
                    ref={canvasRef}
                    className="dist-canvas"
                />

                {/* SVG overlay — axes, player line, dots */}
                {distributionData && containerWidth > 0 && (
                    <svg
                        className="dist-svg"
                        width={W}
                        height={HEIGHT}
                    >
                        {/* Y axis */}
                        <line
                            x1={MARGIN.left} y1={MARGIN.top}
                            x2={MARGIN.left} y2={MARGIN.top + PLOT_H}
                            stroke="var(--border)" strokeWidth="1"
                        />

                        {/* Y ticks + grid lines */}
                        {yTicks.map(({ val, y }) => (
                            <g key={val}>
                                <line
                                    x1={MARGIN.left - 4} y1={y}
                                    x2={MARGIN.left} y2={y}
                                    stroke="var(--border)" strokeWidth="1"
                                />
                                <text
                                    x={MARGIN.left - 8} y={y + 4}
                                    textAnchor="end"
                                    fontSize="11"
                                    fill="var(--text-muted)"
                                >
                                    {formatTick(val)}
                                </text>
                                <line
                                    x1={MARGIN.left} y1={y}
                                    x2={MARGIN.left + PLOT_W} y2={y}
                                    stroke="var(--border)"
                                    strokeWidth="0.5"
                                    strokeOpacity="0.3"
                                />
                            </g>
                        ))}

                        {/* X axis labels */}
                        {xLabels.map(({ season, i }) => (
                            <text
                                key={season}
                                x={toSvgX(i)}
                                y={HEIGHT - 8}
                                textAnchor="middle"
                                fontSize="11"
                                fill="var(--text-muted)"
                            >
                                {season}
                            </text>
                        ))}

                        {/* Player connecting line */}
                        {playerDots.length > 1 && (
                            <polyline
                                points={linePoints}
                                fill="none"
                                stroke="var(--accent)"
                                strokeWidth="2"
                                strokeOpacity="0.9"
                            />
                        )}

                        {/* Player dots */}
                        {playerDots.map(dot => (
                            <g key={dot.season}>
                                <circle cx={dot.x} cy={dot.y} r="7" fill="white" />
                                <circle
                                    cx={dot.x} cy={dot.y} r="5"
                                    fill="var(--accent)"
                                    stroke="white" strokeWidth="1.5"
                                />
                            </g>
                        ))}
                    </svg>
                )}
            </div>
        </div>
    )
}

export default CareerDistributionChart