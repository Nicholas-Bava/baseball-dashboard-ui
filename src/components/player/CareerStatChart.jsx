// src/components/player/CareerStatChart.jsx
import { useState } from 'react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'

// Stats available in the toggle
// key matches the field name in our batting data
// label is what the user sees
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

function CareerStatChart({ batting }) {

    // Track which stat the chart is currently showing
    const [selectedStat, setSelectedStat] = useState('homeRuns')

    if (!batting || batting.length === 0) {
        return <p>No chart data available.</p>
    }

    // Sort by season so the line goes left to right chronologically
    const chartData = [...batting].sort((a, b) => a.season - b.season)

    // Add this function above the component
    const formatYAxis = (value) => {
        if (typeof value === 'number' && value < 1 && value > 0) {
            // Batting average style - 3 decimal places, no leading zero
            return value.toFixed(3).replace('0.', '.')
        }
        return value
    }

    return (
        <div>
            <h2>Career Stat Chart</h2>

            {/* Stat toggle buttons */}
            <div>
                {AVAILABLE_STATS.map(stat => (
                    <button
                        key={stat.key}
                        onClick={() => setSelectedStat(stat.key)}
                    >
                        {stat.label}
                    </button>
                ))}
            </div>

            {/* The chart */}
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="season" />
                    <YAxis tickFormatter={formatYAxis} />
                    <Tooltip />
                    <Line
                        type="monotone"
                        dataKey={selectedStat}
                        stroke="#8884d8"
                        dot={true}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

export default CareerStatChart