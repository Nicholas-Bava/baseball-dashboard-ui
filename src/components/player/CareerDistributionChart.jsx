// src/components/player/CareerDistributionChart.jsx
// This component draws a season-by-season distribution heatmap for a selected batting stat.
// It fetches league-wide distributions from the API and uses a HTML <canvas> to paint a
// density heatmap (KDE per season). An SVG overlay draws axes, the player's per-season
// points, and annotations on top of the canvas. Important pieces:
// - Props: batting (player seasons), playerName, selectedStat, onStatChange
// - Fetch: calls getStatDistribution(selectedStat, ALL_SEASONS) to get arrays of values per season
// - Visualization: computes KDE per season, normalizes densities, paints pixel colors on a canvas
// - SVG overlay: draws axes, year labels, player connecting line and dots
import { useState, useEffect, useRef, useCallback } from 'react'
import { getStatDistribution } from '../../api/baseballApi'
import './CareerDistributionChart.css'

// List of stats the UI might offer to view. The component requests distribution
// data for whichever stat is currently selected; this list documents the
// options and their human-readable labels. (The list itself is not used in the
// drawing code below — it's a reference for the UI.)
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
const ALL_SEASONS = Array.from({ length: 76 }, (_, i) => 1950 + i)

// Silverman's rule-of-thumb for choosing a KDE bandwidth.
// - The bandwidth determines the "smoothness" of the kernel density estimate.
// - Small bandwidth -> spiky estimate, large bandwidth -> overly smooth.
// This function computes an empirical bandwidth from the sample std and size.
const silvermanBandwidth = (values) => {
    const n = values.length
    if (n < 2) return 1
    const mean = values.reduce((a, b) => a + b, 0) / n
    const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n)
    return 1.06 * std * Math.pow(n, -0.2)
}

// Compute the Gaussian kernel density estimate at a single value.
// - `value` is the numeric point where we want the density.
// - `dataPoints` are the sample values for a season.
// - `bandwidth` controls the smoothing (see silvermanBandwidth above).
// Implementation note: this returns the usual KDE normalization (sum of kernels
// divided by n*h*sqrt(2*pi)). The kernel used is the standard Gaussian.
const kernelDensity = (value, dataPoints, bandwidth) => {
    const h = bandwidth
    return dataPoints.reduce((sum, v) => {
        const z = (value - v) / h
        return sum + Math.exp(-0.5 * z * z)
    }, 0) / (dataPoints.length * h * Math.sqrt(2 * Math.PI))
}

function CareerDistributionChart({ batting, playerName, selectedStat, onStatChange }) {
    // distributionData: object keyed by season (e.g. {"1950": [..values..], ...})
    const [distributionData, setDistributionData] = useState(null)
    const [loading, setLoading] = useState(false)

    // Refs for measuring container size and drawing to the canvas
    const containerRef = useRef(null)
    const canvasRef = useRef(null)
    const [containerWidth, setContainerWidth] = useState(0)

    // Layout constants for the canvas + svg overlay. MARGIN defines room for axes/labels.
    const MARGIN = { top: 20, right: 20, bottom: 30, left: 52 }
    const HEIGHT = 380

    // Sort the player's seasons so we can render their dots in chronological order and
    // map season -> season object for quick lookups when overlaying player points.
    const sortedBatting = [...batting].sort((a, b) => a.season - b.season)
    const playerSeasons = new Map(sortedBatting.map(s => [s.season, s]))

    // ── ResizeObserver ────────────────────────────────────────────────
    // ResizeObserver watches the container width so the canvas / svg scale to available space.
    // We update `containerWidth` when the element's contentRect width changes.
    useEffect(() => {
        if (!containerRef.current) return
        const observer = new ResizeObserver(entries => {
            const width = entries[0].contentRect.width
            // Only update when we have a positive width
            if (width > 0) setContainerWidth(width)
        })
        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [])

    // ── Fetch distribution data ───────────────────────────────────────
    // Fetch distribution data whenever the selected stat changes.
    // The API returns, for each season, an array of league player values for the stat.
    // We use the `ignore` flag pattern to avoid calling setState if the component
    // unmounts before the request completes.
    useEffect(() => {
        let ignore = false
        setLoading(true)

        getStatDistribution(selectedStat, ALL_SEASONS)
            .then(res => {
                if (!ignore) {
                    // Store the per-season arrays in state for the painter to use later.
                    setDistributionData(res.data)
                    setLoading(false)
                }
            })
            .catch(() => { if (!ignore) setLoading(false) })

        return () => { ignore = true }
    }, [selectedStat])

    // Translate a normalized density value (0..1 relative to global max) into an RGBA pixel.
    // - Very small normalized values are made transparent to keep the visualization clean.
    // - We apply a power transform (t = normalized^0.55) to shape the curve so that
    //   low densities remain visible while still allowing high densities to saturate.
    // - The function uses several bands (t < 0.2, 0.2..0.4, etc.) to produce a
    //   visually-pleasing color ramp from cool tones to warm (purple→blue→cyan→yellow→red).
    // - Returns [r, g, b, a] where a is an alpha byte (0..255).
    const densityToColor = (normalized) => {
        // Fully transparent for extremely low densities (noise cutoff)
        if (normalized < 0.04) return [0, 0, 0, 0]
        // Slightly boost mid-range densities so the ramp feels more perceptually linear
        const t = Math.pow(normalized, 0.55)

        if (t < 0.2) {
            // very sparse: cool purple — subtle, low-alpha highlight
            const tt = t / 0.2
            return [120, 60, Math.round(180 + tt * 40), Math.round(tt * 80)]
        } else if (t < 0.4) {
            // sparse: blue -> cyan
            const tt = (t - 0.2) / 0.2
            return [Math.round(60 + tt * 0), Math.round(100 + tt * 120), 220, Math.round(80 + tt * 60)]
        } else if (t < 0.6) {
            // medium: cyan -> yellow-green
            const tt = (t - 0.4) / 0.2
            return [Math.round(tt * 200), Math.round(220 - tt * 20), Math.round(220 - tt * 180), Math.round(140 + tt * 40)]
        } else if (t < 0.8) {
            // dense: yellow -> orange
            const tt = (t - 0.6) / 0.2
            return [230, Math.round(200 - tt * 120), 0, Math.round(180 + tt * 20)]
        } else {
            // very dense: orange -> deep red (opaque)
            const tt = (t - 0.8) / 0.2
            return [Math.round(230 - tt * 30), Math.round(80 - tt * 60), 0, 220]
        }
    }

    // ── Paint canvas ──────────────────────────────────────────────────
    // paintCanvas: the heavy-lifting function that draws the heatmap onto the canvas.
    // It is memoized with useCallback so it can be triggered from effects when inputs change.
    // High-level steps inside this function:
    // 1. Determine drawing width/height and create a canvas buffer sized to the layout.
    // 2. Compute a global Y range from the union of all season values (p1..p99 trimmed).
    // 3. For each season, compute a KDE sampled at each pixel row (precompute to speed painting).
    // 4. Normalize densities by the global max density and convert to RGBA via densityToColor.
    // 5. Write pixels to an ImageData buffer and blit it to the canvas in one go.
    const paintCanvas = useCallback(() => {
        if (!canvasRef.current || !distributionData || containerWidth === 0) return

        const canvas = canvasRef.current
        const W = Math.floor(containerWidth)
        const PLOT_W = W - MARGIN.left - MARGIN.right
        const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom

        // Ensure canvas pixel dimensions match layout (avoid blurry scaling)
        canvas.width = Math.floor(W)
        canvas.height = HEIGHT
        canvas.style.width = Math.floor(W) + 'px'
        canvas.style.height = HEIGHT + 'px'

        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, W, HEIGHT)

        // Compute the Y domain using the 1st and 99th percentiles to reduce outlier influence.
        const allValues = Object.values(distributionData).flat().filter(v => !isNaN(v))
        if (!allValues.length) return

        const sorted = [...allValues].sort((a, b) => a - b)
        // Use p1/p99 to get a robust range; then add a small padding fraction.
        const p1  = sorted[Math.floor(sorted.length * 0.01)]
        const p99 = sorted[Math.floor(sorted.length * 0.99)]
        const pad = (p99 - p1) * 0.08
        const yMin = p1 - pad
        const yMax = p99 + pad

        // Pre-compute KDE arrays for each season so we don't recalc kernels per pixel column.
        const seasonKDEs = {}
        let globalMaxDensity = 0

        ALL_SEASONS.forEach(season => {
            const values = (distributionData[String(season)] || []).filter(v => !isNaN(v))
            if (!values.length) return

            // Bandwidth chosen per-season using Silverman's rule applied to that season's samples
            const bw = silvermanBandwidth(values)
            const densities = []

            // For every vertical pixel row within the plot area, sample the KDE at the corresponding stat value.
            for (let py = 0; py < PLOT_H; py++) {
                // Map pixel row -> stat value (yMax at top to yMin at bottom)
                const statVal = yMax - (py / PLOT_H) * (yMax - yMin)
                const density = kernelDensity(statVal, values, bw)
                densities.push(density)
                if (density > globalMaxDensity) globalMaxDensity = density
            }

            seasonKDEs[String(season)] = densities
        })

        if (globalMaxDensity === 0) return

        // Create an ImageData buffer sized to the canvas and fill pixel RGBA values directly.
        // Painting into a buffer and calling putImageData once is much faster than many fillRect calls.
        const imageData = ctx.createImageData(W, HEIGHT)
        const data = imageData.data

        // Iterate over plot columns (seasons mapped across the X axis). To make the
        // violin/heatmap appear smooth between seasons we interpolate densities
        // between adjacent seasons for sub-season x positions.
        for (let px = 0; px < PLOT_W; px++) {
            // Map pixel column -> fractional season index (0..N-1)
            const seasonIndex = (px / (PLOT_W - 1)) * (ALL_SEASONS.length - 1)
            const s1 = Math.floor(seasonIndex)
            const s2 = Math.min(s1 + 1, ALL_SEASONS.length - 1)
            const t = seasonIndex - s1

            const dens1 = seasonKDEs[String(ALL_SEASONS[s1])]
            const dens2 = seasonKDEs[String(ALL_SEASONS[s2])]
            // If neither adjacent season has data, skip this vertical strip.
            if (!dens1 && !dens2) continue

            // For each vertical pixel row combine the two season density samples by linear interpolation
            for (let py = 0; py < PLOT_H; py++) {
                const d1 = dens1 ? dens1[py] : 0
                const d2 = dens2 ? dens2[py] : 0
                const density = d1 * (1 - t) + d2 * t
                const normalized = density / globalMaxDensity

                // Small densities are treated as transparent (no paint) for speed and clarity
                if (normalized < 0.05) continue

                // Convert density -> RGBA color (the helper implements a color ramp)
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

        // Draw the prepared image buffer onto the canvas in a single operation.
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

    // Convert a fractional season index (0..N-1) to an SVG X coordinate.
    // seasonIndex is typically the index in ALL_SEASONS (i) or a fractional interpolated index.
    const toSvgX = (seasonIndex) =>
        MARGIN.left + (seasonIndex / (ALL_SEASONS.length - 1)) * PLOT_W

    // Convert a stat value to an SVG Y coordinate. The SVG origin is top-left so
    // higher stat values map to smaller Y (towards the top). We invert the scale
    // by subtracting from PLOT_H so yMin -> bottom, yMax -> top.
    const toSvgY = (val) =>
        MARGIN.top + PLOT_H - ((val - yMin) / (yMax - yMin)) * PLOT_H

    // Player dots — compute one dot per season the player played.
    // We iterate ALL_SEASONS to keep the x-axis spacing consistent with the heatmap.
    // For each season we look up the player's stat, parse it, and convert to SVG coords.
    const playerDots = ALL_SEASONS.map((season, i) => {
        const s = playerSeasons.get(season)
        if (!s) return null
        // Parse the player's stat value for the selected metric; skip if missing or NaN.
        const val = parseFloat(s[selectedStat])
        if (isNaN(val)) return null
        return { x: toSvgX(i), y: toSvgY(val), season, value: val }
    }).filter(Boolean)

    const linePoints = playerDots.map(d => `${d.x},${d.y}`).join(' ')

    // Y axis ticks — pick a small number of evenly spaced values between yMin and yMax
    // and convert each to an SVG Y coordinate. These are used to draw tick marks and labels.
    const yTicks = Array.from({ length: 7 }, (_, i) => {
        const val = yMin + (i / 6) * (yMax - yMin)
        return { val, y: toSvgY(val) }
    })

    // Convert a numeric tick value to a human-readable label. For rate stats (avg, obp, etc.)
    // we show the 3-digit decimal (e.g. .312) and for count stats we round to the nearest integer.
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