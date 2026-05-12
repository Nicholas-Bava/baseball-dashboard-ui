// src/components/player/SeasonModal.jsx
import { useState, useEffect } from 'react'
import { getBattingRankings } from '../../api/baseballApi'
import './SeasonModal.css'

function SeasonModal({ season, playerName, onClose }) {

    // Rankings data from Flask - null while loading
    const [rankings, setRankings] = useState(null)

    // Whether rankings are still being fetched
    const [rankingsLoading, setRankingsLoading] = useState(true)

    // Runs once when the modal first opens
    useEffect(() => {
        getBattingRankings(season.playerId, season.season)
            .then(response => {
                setRankings(response.data)
            })
            .catch(err => {
                console.error('Failed to fetch rankings', err)
            })
            .finally(() => {
                setRankingsLoading(false)
            })
    }, [season.playerId, season.season])
    return (
        <div className="modal-overlay" onClick={onClose}>

            {/* stopPropagation prevents clicks inside the card
                from closing the modal */}
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="modal-header">
                    <div>
                        <div className="modal-title">
                            {playerName} — {season.season} Season
                        </div>
                        <div className="modal-subtitle">
                            Season Deep Dive
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                {/* Key stat cards */}
                <div className="stat-cards">
                    <div className="stat-card">
                        <div className="stat-card-label">Home Runs</div>
                        <div className="stat-card-value">{season.homeRuns ?? '-'}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-label">RBI</div>
                        <div className="stat-card-value">{season.rbi ?? '-'}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-label">Batting Avg</div>
                        <div className="stat-card-value rate">{season.avg ?? '-'}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-label">OBP</div>
                        <div className="stat-card-value rate">{season.obp ?? '-'}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-label">SLG</div>
                        <div className="stat-card-value rate">{season.slg ?? '-'}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-label">OPS</div>
                        <div className="stat-card-value rate">{season.ops ?? '-'}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-label">Games</div>
                        <div className="stat-card-value">{season.gamesPlayed ?? '-'}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-label">Hits</div>
                        <div className="stat-card-value">{season.hits ?? '-'}</div>
                    </div>
                </div>
                {/* League Rankings Section */}
                <div className="modal-section-title">
                    League Rankings — {season.season}
                </div>

                {/* Show loading while fetching */}
                {rankingsLoading && (
                    <div className="modal-loading">
                        Loading rankings...
                    </div>
                )}

                {/* Show rankings once loaded */}
                {!rankingsLoading && rankings && (
                    <div className="rankings-grid">
                        {Object.entries(rankings).map(([stat, data]) => (
                            data && (
                                <div key={stat} className="ranking-row">
                    <span className="ranking-stat-name">
                        {stat.toUpperCase()}
                    </span>
                                    <span className="ranking-value">
                        {data.value}
                    </span>
                                    <span className="ranking-rank">
                        #{data.rank}
                                        <span className="ranking-total">
                            /{data.totalPlayers}
                        </span>
                    </span>
                                </div>
                            )
                        ))}
                    </div>
                )}

            </div>
        </div>
    )
}

export default SeasonModal