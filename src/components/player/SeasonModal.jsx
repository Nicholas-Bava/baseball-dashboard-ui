// src/components/player/SeasonModal.jsx
import './SeasonModal.css'

function SeasonModal({ season, playerName, onClose }) {
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

            </div>
        </div>
    )
}

export default SeasonModal