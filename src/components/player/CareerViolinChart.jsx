// src/components/player/CareerDistributionChart.jsx
import { useState, useEffect, useRef } from 'react'
import { getStatDistribution } from '../../api/baseballApi'
import './CareerViolinChart.css'

const AVAILABLE_STATS = [
    { key: 'homeRuns',     label: 'Home Runs' },
    { key: 'avg',          label: 'Batting Average' },
    { key: 'rbi',          label: 'RBI' },
    { key: 'ops',          label: 'OPS' },
    { key: 'hits',         label: 'Hits' },
    { key: 'stolenBases',  label: 'Stolen Bases' },
    { key: 'baseOnBalls',  label: 'Walks' },
    { key: 'woba',         label: 'wOBA' },
]

const RATE_STATS = ['avg', 'obp', 'slg', 'ops', 'woba']

// Gaussian kernel for KDE
const gaussianKernel = (dist, bandwidth) =>
    Math.exp(-0.5 * (dist / bandwidth) ** 2)

// Compute KDE density at a given value
const kde = (value, dataPoints, bandwidth) =>
    dataPoints.reduce((sum, v) => sum + gaussianKernel(value - v, bandwidth), 0)

// Generate smooth bezier path from array of [x, y] points
const smoothPath = (points) => {
    if (points.length < 2) return ''
    let d = `M ${points[0][0]},${points[0][1]}`
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]
        const curr = points[i]
        const cpX = (prev[0] + curr[0]) / 2
        d += ` C ${cpX},${prev[1]} ${cpX},${curr[1]} ${curr[0]},${curr[1]}`
    }
    return d
}

function CareerDistributionChart({ batting, playerName, selectedStat, onStatChange }) {

    const [distributionData, setDistributionData] = useState(null)
    const [loading, setLoading] = useState(false)

    const svgRef = useRef(null)

    // SVG layout constants
    const WIDTH = 900
    const HEIGHT = 400
    const MARGIN = { top: 20, right: 20, bottom: 30, left: 50 }
    const PLOT_W = WIDTH - MARGIN.left - MARGIN.right
    const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom

    // Full historical range — not just player seasons
    const ALL_SEASONS = Array.from({ length: 36 }, (_, i) => 1990 + i)

// Player's seasons for dot rendering
    const sortedBatting = [...batting].sort((a, b) => a.season - b.season)
    const playerSeasons = new Set(sortedBatting.map(s => s.season))

// Fetch uses ALL seasons
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
            .catch(err => {
                console.error('Failed to fetch distribution', err)
                if (!ignore) setLoading(false)
            })

        return () => { ignore = true }
    }, [selectedStat])

    if (loading || !distributionData) {
        return (
            <div className="dist-chart-container">
                <div className="dist-chart-loading">Loading distribution...</div>
            </div>
        )
    }

    // ── Compute Y axis range ──────────────────────────────────────────
    const allValues = Object.values(distributionData).flat()
    const dataMin = Math.min(...allValues)
    const dataMax = Math.max(...allValues)
    const padding = (dataMax - dataMin) * 0.08
    const yMin = dataMin - padding
    const yMax = dataMax + padding

    // ── Scale functions ───────────────────────────────────────────────
    // Convert data value → SVG Y pixel (inverted — high values at top)
    const toSvgY = (val) =>
        MARGIN.top + PLOT_H - ((val - yMin) / (yMax - yMin)) * PLOT_H

    // Convert season index → SVG X pixel
    const toSvgX = (index) =>
        MARGIN.left + (index / (ALL_SEASONS.length - 1)) * PLOT_W

    // ── Compute KDE for each season ───────────────────────────────────
    const KDE_SAMPLES = 80   // how many Y points to sample
    const MAX_HALF_WIDTH = (PLOT_W / ALL_SEASONS.length) * 0.42

    // Compute density curves and find global max for normalization
    const seasonDensities = ALL_SEASONS.map((season, i) => {
        const values = distributionData[season] || []
        if (!values.length) return { season, i, densities: [], values }

        const bandwidth = (dataMax - dataMin) * 0.06

        // Sample KDE at evenly spaced Y values
        const densities = []
        for (let j = 0; j <= KDE_SAMPLES; j++) {
            const yVal = yMin + (j / KDE_SAMPLES) * (yMax - yMin)
            const density = kde(yVal, values, bandwidth)
            densities.push({ yVal, density })
        }

        return { season, i, densities, values }
    })

    // Global max density for normalization
    const globalMaxDensity = Math.max(
        ...seasonDensities.flatMap(s => s.densities.map(d => d.density))
    )

    // ── Build violin paths ────────────────────────────────────────────
    const violins = seasonDensities.map(({ season, i, densities }) => {
        if (!densities.length) return null

        const cx = toSvgX(i)

        // Build right side points then mirror for left side
        const rightPoints = densities.map(({ yVal, density }) => {
            const normalizedWidth = (density / globalMaxDensity) * MAX_HALF_WIDTH
            return [cx + normalizedWidth, toSvgY(yVal)]
        })

        const leftPoints = densities.map(({ yVal, density }) => {
            const normalizedWidth = (density / globalMaxDensity) * MAX_HALF_WIDTH
            return [cx - normalizedWidth, toSvgY(yVal)]
        }).reverse()

        // Combine into one closed path
        const allPoints = [...rightPoints, ...leftPoints]
        const pathD = smoothPath(allPoints) + ' Z'

        // Gradient id unique per season
        const gradId = `violin-grad-${season}`

        return { season, i, cx, pathD, gradId, densities }
    }).filter(Boolean)

    // ── Player dots ───────────────────────────────────────────────────
    const playerDots = ALL_SEASONS.map((season, i) => {
        if (!playerSeasons.has(season)) return null
        const playerSeason = sortedBatting.find(s => s.season === season)
        if (!playerSeason) return null
        const val = parseFloat(playerSeason[selectedStat])
        if (isNaN(val)) return null
        return {
            x: toSvgX(i),
            y: toSvgY(val),
            season,
            value: val
        }
    }).filter(Boolean)

    // Connecting line points
    const linePoints = playerDots.map(d => `${d.x},${d.y}`).join(' ')

    // ── Y axis ticks ──────────────────────────────────────────────────
    const yTicks = []
    const tickCount = 6
    for (let i = 0; i <= tickCount; i++) {
        const val = yMin + (i / tickCount) * (yMax - yMin)
        yTicks.push({ val, y: toSvgY(val) })
    }

    const formatTick = (val) => {
        if (RATE_STATS.includes(selectedStat)) {
            return val.toFixed(3).replace('0.', '.')
        }
        return Math.round(val)
    }

    return (
        <div className="dist-chart-container">

            <svg
                ref={svgRef}
                width="100%"
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    {/* Gradient for each violin */}
                    {violins.map(({ gradId, cx, densities }) => {
                        const maxWidth = Math.max(
                            ...densities.map(d => (d.density / globalMaxDensity) * MAX_HALF_WIDTH)
                        )
                        return (
                            <radialGradient
                                key={gradId}
                                id={gradId}
                                cx="50%" cy="50%" r="50%"
                            >
                                <stop offset="0%" stopColor="var(--violin-color)" stopOpacity="0.85" />
                                <stop offset="100%" stopColor="var(--violin-color)" stopOpacity="0" />
                            </radialGradient>
                        )
                    })}
                </defs>

                {/* Y axis line */}
                <line
                    x1={MARGIN.left} y1={MARGIN.top}
                    x2={MARGIN.left} y2={MARGIN.top + PLOT_H}
                    stroke="var(--border)" strokeWidth="1"
                />

                {/* Y axis ticks and labels */}
                {yTicks.map(({ val, y }) => (
                    <g key={val}>
                        <line
                            x1={MARGIN.left - 4} y1={y}
                            x2={MARGIN.left} y2={y}
                            stroke="var(--border)" strokeWidth="1"
                        />
                        <text
                            x={MARGIN.left - 8}
                            y={y + 4}
                            textAnchor="end"
                            fontSize="11"
                            fill="var(--text-muted)"
                        >
                            {formatTick(val)}
                        </text>
                        {/* Horizontal grid line */}
                        <line
                            x1={MARGIN.left} y1={y}
                            x2={MARGIN.left + PLOT_W} y2={y}
                            stroke="var(--border)" strokeWidth="0.5"
                            strokeOpacity="0.5"
                        />
                    </g>
                ))}

                {/* X axis labels */}
                {ALL_SEASONS.map((season, i) => (
                    season % 5 === 0 && (
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
                    )
                ))}

                {/* Violin shapes */}
                {violins.map(({ season, gradId, pathD }) => (
                    <path
                        key={season}
                        d={pathD}
                        fill={`url(#${gradId})`}
                        stroke="var(--violin-color)"
                        strokeWidth="0.5"
                        strokeOpacity="0.3"
                    />
                ))}

                {/* Player connecting line */}
                {playerDots.length > 1 && (
                    <polyline
                        points={linePoints}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="2"
                        strokeOpacity="0.8"
                    />
                )}

                {/* Player dots */}
                {playerDots.map(dot => (
                    <g key={dot.season}>
                        {/* White halo for contrast */}
                        <circle
                            cx={dot.x} cy={dot.y}
                            r="6"
                            fill="white"
                        />
                        <circle
                            cx={dot.x} cy={dot.y}
                            r="4.5"
                            fill="var(--accent)"
                            stroke="white"
                            strokeWidth="1.5"
                        />
                    </g>
                ))}

            </svg>
        </div>
    )
}

export default CareerDistributionChart