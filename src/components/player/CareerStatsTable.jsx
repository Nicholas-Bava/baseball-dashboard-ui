// src/components/player/CareerStatsTable.jsx
import './CareerStatsTable.css'

// Rate stats that get special coloring
const RATE_STATS = ['avg', 'obp', 'slg', 'ops']

const BATTING_COLUMNS = [
    { key: 'season',        label: 'Year' },
    { key: 'age',           label: 'Age' },
    { key: 'team',          label: 'Team' },
    { key: 'gamesPlayed',   label: 'G' },
    { key: 'atBats',        label: 'AB' },
    { key: 'runs',          label: 'R' },
    { key: 'hits',          label: 'H' },
    { key: 'doubles',       label: '2B' },
    { key: 'triples',       label: '3B' },
    { key: 'homeRuns',      label: 'HR' },
    { key: 'rbi',           label: 'RBI' },
    { key: 'stolenBases',   label: 'SB' },
    { key: 'baseOnBalls',   label: 'BB' },
    { key: 'strikeOuts',    label: 'SO' },
    { key: 'avg',           label: 'AVG' },
    { key: 'obp',           label: 'OBP' },
    { key: 'slg',           label: 'SLG' },
    { key: 'ops',           label: 'OPS' },
]

function CareerStatsTable({ batting }) {

    if (!batting || batting.length === 0) {
        return <p>No batting data available.</p>
    }

    return (
        <div className="stats-table-container">
            <h2>Career Batting Stats</h2>
            <table className="stats-table">
                <thead>
                <tr>
                    {BATTING_COLUMNS.map(col => (
                        <th key={col.key}>{col.label}</th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {batting.map((season, index) => (
                    <tr key={index}>
                        {BATTING_COLUMNS.map(col => (
                            <td
                                key={col.key}
                                className={RATE_STATS.includes(col.key) ? 'rate-stat' : ''}
                            >
                                {season[col.key] ?? '-'}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    )
}

export default CareerStatsTable