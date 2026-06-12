// src/components/player/SeasonModal.jsx
// Modal dialog that shows detailed season-level stats for a single player.
// Props:
// - season: an object representing a single season (contains season number, playerId, and stats)
// - playerName: string used in the modal header
// - onClose: callback to close the modal
import { useState, useEffect } from 'react'
import { getBattingRankings, getStatcastSeason, getStatcastRankings } from '../../api/baseballApi'
import ZoneHeatMap from './ZoneHeatMap'
import './SeasonModal.css'

function SeasonModal({ season, playerName, onClose }) {

    // Batting rankings from league context API (per-stat rank & total players)
    const [battingRankings, setBattingRankings] = useState(null)

    // Statcast season aggregated metrics (exit velocity, xwOBA, etc.)
    const [statcastData, setStatcastData] = useState(null)

    // Statcast rankings for those metrics (rank/total for each metric)
    const [statcastRankings, setStatcastRankings] = useState(null)

    // Whether data is still loading — used to show loading placeholder until all API calls finish
    const [loading, setLoading] = useState(true)

    // Check if the batting rankings response indicates the player did not qualify (all null)
    const didNotQualifyBatting = battingRankings &&
        Object.values(battingRankings).every(v => v === null)

    const BATTING_ROWS = [
        { label: 'AVG', getValue: (s) => s.avg,           rankKey: 'avg' },
        { label: 'OBP', getValue: (s) => s.obp,           rankKey: null },
        { label: 'SLG', getValue: (s) => s.slg,           rankKey: null },
        { label: 'OPS', getValue: (s) => s.ops,           rankKey: 'ops' },
        { label: 'H',   getValue: (s) => s.hits,          rankKey: 'hits' },
        { label: '2B',  getValue: (s) => s.doubles,       rankKey: 'doubles' },
        { label: '3B',  getValue: (s) => s.triples,       rankKey: 'triples' },
        { label: 'HR',  getValue: (s) => s.homeRuns,     rankKey: 'homeRuns' },
        { label: 'RBI', getValue: (s) => s.rbi,           rankKey: 'rbi' },
        { label: 'SB',  getValue: (s) => s.stolenBases,   rankKey: 'stolenBases' },
        { label: 'BB',  getValue: (s) => s.baseOnBalls,   rankKey: null },
        { label: 'SO',  getValue: (s) => s.strikeOuts,    rankKey: null },
        { label: 'G',   getValue: (s) => s.gamesPlayed,   rankKey: null },
        { label: 'XBH', getValue: (s) => {
                const d = s.doubles ?? 0
                const t = s.triples ?? 0
                const hr = s.homeRuns ?? 0
                return d + t + hr
            }, rankKey: 'xbh' },
    ]

    const STATCAST_ROWS = [
        { label: 'Exit Velo',    getValue: (sc) => sc.avg_exit_velo,  rankKey: 'avg_exit_velo' },
        { label: 'Hard Hit %', getValue: (sc) => sc.hard_hit_pct?.toFixed(1), rankKey: 'hard_hit_pct' },
        { label: 'Barrel %',     getValue: (sc) => sc.barrel_pct?.toFixed(1),    rankKey: 'barrel_pct' },
        { label: 'Sweet Spot %', getValue: (sc) => sc.sweet_spot_pct?.toFixed(1), rankKey: 'sweet_spot_pct' },
        { label: 'xBA',          getValue: (sc) => sc.xba?.toFixed(3).replace('0.', '.'),            rankKey: 'xba' },
        { label: 'xwOBA', getValue: (sc) => sc.xwoba?.toFixed(3).replace('0.', '.'), rankKey: 'xwoba' },
        { label: 'xwOBAcon',     getValue: (sc) => sc.xwobacon?.toFixed(3).replace('0.', '.'),       rankKey: 'xwobacon' },
        { label: 'Whiff %',      getValue: (sc) => sc.whiff_pct?.toFixed(1),      rankKey: 'whiff_pct' },
        { label: 'Chase %',      getValue: (sc) => sc.chase_pct?.toFixed(1),      rankKey: 'chase_pct' },
    ]

    useEffect(() => {
        let completed = 0
        const checkDone = () => {
            completed++
            if (completed === 3) setLoading(false)
        }

        getBattingRankings(season.playerId, season.season)
            .then(res => setBattingRankings(res.data))
            .catch(err => console.error('Batting rankings failed', err))
            .finally(checkDone)

        getStatcastSeason(season.playerId, season.season)
            .then(res => setStatcastData(res.data))
            .catch(err => console.error('Statcast season failed', err))
            .finally(checkDone)

        getStatcastRankings(season.playerId, season.season)
            .then(res => setStatcastRankings(res.data))
            .catch(err => console.error('Statcast rankings failed', err))
            .finally(checkDone)

    }, [season.playerId, season.season])

    return (
        <div className="modal-overlay" onClick={onClose}>
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
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Loading state */}
                {loading && (
                    <div className="modal-loading">Loading...</div>
                )}

                {/* Content — only shows when all data is loaded */}
                {!loading && (
                    <div className="modal-stats-table">

                        {/* BATTING SECTION */}
                        <div className="modal-section-header">
                            Batting
                            {didNotQualifyBatting && (
                                <span className="modal-section-qualifier">
                                    Did not qualify — {season.plateAppearances} PA (min {season.season === 2020 ? 186 : 502})
                                </span>
                            )}
                        </div>
                        <table className="modal-table">
                            <tbody>
                            {BATTING_ROWS.map(row => {
                                const value = row.getValue(season)
                                const rankData = row.rankKey && battingRankings
                                    ? battingRankings[row.rankKey]
                                    : null

                                return (
                                    <tr key={row.label}>
                                        <td className="modal-stat-name">{row.label}</td>
                                        <td className="modal-stat-value">
                                            {value ?? '-'}
                                        </td>
                                        <td className="modal-stat-rank">
                                            {rankData
                                                ? <span>#{rankData.rank}<span className="rank-total">/{rankData.totalPlayers}</span></span>
                                                : <span className="rank-none">—</span>
                                            }
                                        </td>
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>

                        {/* STATCAST SECTION */}
                        {season.season < 2015 ? (
                            <div className="modal-section-header">
                                Statcast
                                <span className="modal-section-qualifier" style={{color: 'var(--text-muted)'}}>
                                    Not available — Statcast tracking began in 2015
                                </span>
                            </div>
                        ) : (
                            <>
                                <div className="modal-section-header">
                                    Statcast
                                    {season.season < 2020 && (
                                        <span className="modal-section-qualifier">
                                            Pre-2020 data may differ slightly from Baseball Savant
                                        </span>
                                    )}
                                </div>
                                {statcastData ? (
                                    <table className="modal-table">
                                        <tbody>
                                        {STATCAST_ROWS.map(row => {
                                            const value = row.getValue(statcastData)
                                            const rankData = row.rankKey && statcastRankings
                                                ? statcastRankings[row.rankKey]
                                                : null

                                            return (
                                                <tr key={row.label}>
                                                    <td className="modal-stat-name">{row.label}</td>
                                                    <td className="modal-stat-value">
                                                        {value ?? '-'}
                                                    </td>
                                                    <td className="modal-stat-rank">
                                                        {rankData
                                                            ? <span>#{rankData.rank}<span className="rank-total">/{rankData.totalPlayers}</span></span>
                                                            : <span className="rank-none">—</span>
                                                        }
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="modal-loading">No Statcast data available for this season</div>
                                )}
                            </>
                        )}

                        {/* Zone Heat Map - only for 2015+ */}
                        {season.season >= 2015 && (
                            <ZoneHeatMap
                                key={`${season.playerId}-${season.season}`}
                                playerId={season.playerId}
                                season={season.season}
                            />
                        )}

                    </div>
                )}

            </div>
        </div>
    )
}

export default SeasonModal