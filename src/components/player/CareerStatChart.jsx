// src/components/player/CareerStatChart.jsx
// CareerStatChart renders an interactive timeseries chart for a single player.
// It combines the player's per-season stat with league context (league average and leader)
// fetched from the API so you can compare the player's performance against the league.
// Key points:
// - Props: batting (player seasons), playerName, selectedStat, onStatChange
// - Fetches league context via getBattingLeagueContext(selectedStat, seasons)
// - Uses Recharts (ComposedChart/Line) to draw player, league average and league leader lines
import { useState, useEffect } from 'react'
import {
    ComposedChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts'
import { getBattingLeagueContext } from '../../api/baseballApi'
import './CareerStatChart.css'

const AVAILABLE_STATS = [
    { key: 'homeRuns',    label: 'Home Runs' },
    { key: 'avg',         label: 'Batting Average' },
    { key: 'rbi',         label: 'RBI' },
    { key: 'ops',         label: 'OPS' },
    { key: 'hits',        label: 'Hits' },
    { key: 'strikeOuts',  label: 'Strikeouts' },
    { key: 'stolenBases', label: 'Stolen Bases' },
    { key: 'runs',        label: 'Runs' },
]

const LOWER_IS_BETTER = ['era', 'whip', 'walksPer9Inn', 'hitsPer9Inn']

const isGoodAboveAverage = (stat) => !LOWER_IS_BETTER.includes(stat)

// Outside CareerStatChart - above the function declaration
const CustomTooltip = ({ active, payload, label, chartData }) => {
    if (active && payload && payload.length) {
        const leaderName = chartData.find(d => d.season === label)?.leagueLeaderName
        return (
            <div className="chart-tooltip">
                <p className="tooltip-season">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} style={{ color: entry.color }}>
                        {entry.name}: {entry.value}
                        {entry.name === 'League Leader' && leaderName
                            ? ` (${leaderName})`
                            : ''}
                    </p>
                ))}
            </div>
        )
    }
    return null
}


function CareerStatChart({ batting, playerName, selectedStat, onStatChange }) {

    // League context data - average and leader per season
    const [leagueContext, setLeagueContext] = useState([])

    const RATE_STATS = ['avg', 'obp', 'slg', 'ops', 'babip']

    const formatYAxis = (value) => {
        if (RATE_STATS.includes(selectedStat)) {
            return value.toFixed(3).replace('0.', '.')
        }
        return Math.round(value)
    }

    // Sort batting by season for the chart
    const sortedBatting = [...batting].sort((a, b) => a.season - b.season)

    // Extract the list of seasons from the player's data
    // We send this to the API so we only get context for seasons the player played
    const seasons = sortedBatting.map(s => s.season)

    useEffect(() => {
        if (seasons.length === 0) return

        // Fetch league context whenever the selected stat changes
        getBattingLeagueContext(selectedStat, seasons)
            .then(response => {
                setLeagueContext(response.data)
            })
            .catch(err => {
                console.error('Failed to fetch league context', err)
                setLeagueContext([])
            })

    }, [selectedStat]) // re-runs every time user toggles a stat

    // Merge player data with league context into one array for Recharts
    // Recharts needs all three values on the same data point object
    const chartData = sortedBatting.map(season => {
        const context = leagueContext.find(c => c.season === season.season)
        const playerValue = parseFloat(season[selectedStat]) || null
        const leagueAverage = context ? context.leagueAverage : null
        const leagueLeaderValue = context ? context.leagueLeaderValue : null

        // Determine if player is performing "well" based on stat direction
        const goodAboveAvg = isGoodAboveAverage(selectedStat)
        const isAboveAverage = playerValue !== null && leagueAverage !== null
            && playerValue > leagueAverage

        // For "good above average" stats: above = good (green), below = bad (red)
        // For "lower is better" stats: above = bad (red), below = good (green)
        const isPerformingWell = goodAboveAvg ? isAboveAverage : !isAboveAverage

        return {
            season: season.season,
            playerValue,
            leagueAverage,
            leagueLeaderValue,
            leagueLeaderName: context ? context.leagueLeaderName : null,
            // Split into above/below for colored shading
            goodValue: isPerformingWell ? playerValue : leagueAverage,
            badValue: isPerformingWell ? leagueAverage : playerValue,
        }
    })

    const validValues = chartData
        .flatMap(d => [d.playerValue, d.leagueAverage, d.leagueLeaderValue])
        .filter(v => v !== null && v !== undefined && !isNaN(v))

    const yMin = validValues.length > 0
        ? Math.max(0, Math.min(...validValues) * 0.9)
        : 'auto'

    const yMax = validValues.length > 0
        ? Math.max(...validValues) * 1.1
        : 'auto'

    if (!batting || batting.length === 0) {
        return <p>No chart data available.</p>
    }

    return (
        <div className="chart-container">
            <h2>Career Stat Chart</h2>

            <div className="stat-toggle">
                {AVAILABLE_STATS.map(stat => (
                    <button
                        key={stat.key}
                        className={selectedStat === stat.key ? 'active' : ''}
                        onClick={() => onStatChange(stat.key)}
                    >
                        {stat.label}
                    </button>
                ))}
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                    data={chartData}
                    margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="season" />
                    <YAxis tickFormatter={formatYAxis} domain={[yMin, yMax]} />
                    <Tooltip content={<CustomTooltip chartData={chartData} />} />
                    <Legend />

                    {/* Player line - solid teal with custom dots that draw gap lines */}
                    <Line
                        type="monotone"
                        dataKey="playerValue"
                        name={playerName}
                        stroke="#0891b2"
                        strokeWidth={2}
                        connectNulls={false}
                        label={(props) => {
                            const { x, y, value } = props
                            if (!value) return null
                            return (
                                <text
                                    x={x + 10}
                                    y={y - 8}
                                    textAnchor="middle"
                                    fontSize={11}
                                    fontWeight={600}
                                    fill="#0891b2"
                                >
                                    {RATE_STATS.includes(selectedStat)
                                        ? value.toFixed(3).replace('0.', '.')
                                        : Math.round(value)}
                                </text>
                            )
                        }}
                        dot={(props) => {
                            const { cx, cy, payload, height } = props

                            if (!payload.leagueAverage || !payload.leagueLeaderValue) {
                                return <circle key={payload.season} cx={cx} cy={cy} r={4} fill="#0891b2" />
                            }

                            // pixels per data unit - using the full domain we already calculated
                            const pixelsPerUnit = height / (yMax - yMin)

                            // calculate y position relative to the player dot (cy is our anchor)
                            const valueToY = (val) => cy + (payload.playerValue - val) * pixelsPerUnit

                            const yAverage = valueToY(payload.leagueAverage)
                            const yLeader = valueToY(payload.leagueLeaderValue)

                            const isGoodAbove = isGoodAboveAverage(selectedStat)
                            const isGood = isGoodAbove
                                ? payload.playerValue >= payload.leagueAverage
                                : payload.playerValue <= payload.leagueAverage

                            const avgColor = isGood ? '#10b981' : '#ef4444'

                            return (
                                <g key={payload.season}>
                                    <line
                                        x1={cx} y1={cy}
                                        x2={cx} y2={yAverage}
                                        stroke={avgColor}
                                        strokeWidth={1.5}
                                        strokeOpacity={0.8}
                                    />
                                    <line
                                        x1={cx} y1={cy}
                                        x2={cx} y2={yLeader}
                                        stroke="#d97706"
                                        strokeWidth={1}
                                        strokeOpacity={0.5}
                                    />
                                    <circle cx={cx} cy={cy} r={4} fill="#0891b2" stroke="white" strokeWidth={1} />
                                </g>
                            )
                        }}
                    />

                    {/* League average line - dashed gray */}
                    <Line
                        type="monotone"
                        dataKey="leagueAverage"
                        name="League Average"
                        stroke="#94a3b8"
                        strokeWidth={1.5}
                        strokeDasharray="5 5"
                        dot={false}
                        connectNulls={false}
                    />

                    {/* League leader line - dotted gold */}
                    <Line
                        type="monotone"
                        dataKey="leagueLeaderValue"
                        name="League Leader"
                        stroke="#d97706"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        dot={false}
                        connectNulls={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    )
}

export default CareerStatChart