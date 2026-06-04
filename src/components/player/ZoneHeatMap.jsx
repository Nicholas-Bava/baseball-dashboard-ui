import { useState, useEffect } from 'react'
import { getStatcastZones } from '../../api/baseballApi'
import './ZoneHeatMap.css'

const ZONE_STATS = [
    { key: 'xbacon',        label: 'xBA (contact)',   lowerIsBetter: false },
    { key: 'xwobacon',      label: 'xwOBA (contact)', lowerIsBetter: false },
    { key: 'avg_exit_velo', label: 'Exit Velocity',   lowerIsBetter: false },
    { key: 'hard_hit_pct',  label: 'Hard Hit %',      lowerIsBetter: false },
    { key: 'barrel_pct',    label: 'Barrel %',        lowerIsBetter: false },
    { key: 'sweet_spot_pct',label: 'Sweet Spot %',    lowerIsBetter: false },
    { key: 'whiff_pct',     label: 'Whiff %',         lowerIsBetter: true  },
    { key: 'swing_pct',     label: 'Swing %',         lowerIsBetter: false },
]

// SVG layout constants
const W = 260        // total SVG width
const H = 260        // total SVG height
const SH = 40        // shadow zone thickness (thinner corners)
const CELL = 60      // inner cell size
const MX = W / 2    // 130
const MY = H / 2    // 130
const IX = SH        // 40
const IY = SH        // 40



// L-shaped SVG paths for corner zones
const CORNER_PATHS = {
    11: `M 0,0 H ${MX} V ${SH} H ${IX} V ${MY} H 0 Z`,
    12: `M ${MX},0 H ${W} V ${MY} H ${IX + CELL*3} V ${SH} H ${MX} Z`,
    13: `M 0,${MY} H ${IX} V ${IY + CELL*3} H ${MX} V ${H} H 0 Z`,
    14: `M ${IX + CELL*3},${MY} H ${W} V ${H} H ${MX} V ${IY + CELL*3} H ${IX + CELL*3} Z`,
}

// Rectangle zones for inner 1-9
const INNER_RECTS = {
    1: { x: IX,           y: IY           },
    2: { x: IX + CELL,    y: IY           },
    3: { x: IX + CELL*2,  y: IY           },
    4: { x: IX,           y: IY + CELL    },
    5: { x: IX + CELL,    y: IY + CELL    },
    6: { x: IX + CELL*2,  y: IY + CELL    },
    7: { x: IX,           y: IY + CELL*2  },
    8: { x: IX + CELL,    y: IY + CELL*2  },
    9: { x: IX + CELL*2,  y: IY + CELL*2  },
}

const getZoneColor = (playerValue, leagueValue, lowerIsBetter) => {
    if (playerValue === null || playerValue === undefined) return '#e0e0e0'
    if (leagueValue === null || leagueValue === undefined) return '#e0e0e0'

    const diff = lowerIsBetter
        ? leagueValue - playerValue
        : playerValue - leagueValue

    const normalized = leagueValue !== 0 ? diff / leagueValue : 0
    const clamped = Math.max(-0.3, Math.min(0.3, normalized))
    const intensity = Math.abs(clamped) / 0.3

    if (clamped > 0) {
        const g = Math.round(220 - intensity * 160)
        const b = Math.round(220 - intensity * 160)
        return `rgb(220, ${g}, ${b})`
    } else if (clamped < 0) {
        const r = Math.round(220 - intensity * 160)
        const g = Math.round(220 - intensity * 160)
        return `rgb(${r}, ${g}, 220)`
    }
    return 'rgb(220, 220, 220)'
}

const formatZoneValue = (value, statKey) => {
    if (value === null || value === undefined) return '-'
    const pctStats = ['hard_hit_pct', 'barrel_pct', 'sweet_spot_pct', 'whiff_pct', 'swing_pct']
    const ratioStats = ['xbacon', 'xwobacon']
    if (pctStats.includes(statKey)) return value.toFixed(1)
    if (ratioStats.includes(statKey)) return value.toFixed(3).replace('0.', '.')
    if (statKey === 'avg_exit_velo') return value.toFixed(1)
    return value.toFixed(2)
}

function ZoneHeatMap({ playerId, season }) {
    const [selectedStat, setSelectedStat] = useState('xbacon')
    const [zoneData, setZoneData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        console.log('ZoneHeatMap effect - playerId:', playerId, 'season:', season)
        if (!playerId || !season) {
            console.log('Missing playerId or season - returning early')
            return
        }

        let ignore = false

        getStatcastZones(playerId, season)
            .then(res => {
                if (!ignore) {
                    setZoneData(res.data)
                    setLoading(false)
                }
            })
            .catch(err => {
                console.log('Fetch error:', err.message)
                if (!ignore) {
                    setLoading(false)
                }
            })

        return () => {
            ignore = true
        }
    }, [playerId, season])

    const statConfig = ZONE_STATS.find(s => s.key === selectedStat)

    const getZoneProps = (zoneNum) => {
        const zone = zoneData?.zones?.find(z => z.zone === zoneNum)
        console.log(`Zone ${zoneNum}:`, zone)
        const playerValue = zone ? zone[selectedStat] : null
        const leagueValue = zone ? zone[`league_${selectedStat}`] : null
        const color = getZoneColor(playerValue, leagueValue, statConfig?.lowerIsBetter ?? false)
        const label = formatZoneValue(playerValue, selectedStat)
        return { color, label }
    }

    return (
        <div className="zone-heatmap-container">
            <div className="zone-heatmap-header">
                <span className="zone-heatmap-title">Zone Heat Map</span>
                <select
                    className="zone-stat-select"
                    value={selectedStat}
                    onChange={(e) => setSelectedStat(e.target.value)}
                >
                    {ZONE_STATS.map(stat => (
                        <option key={stat.key} value={stat.key}>{stat.label}</option>
                    ))}
                </select>
            </div>

            {loading && <div className="modal-loading">Loading zones...</div>}

            {!loading && zoneData && (
                <svg
                    width={W}
                    height={H}
                    style={{ display: 'block', margin: '0 auto' }}
                >
                    {/* Corner L-shaped zones */}
                    {[11, 12, 13, 14].map(zoneNum => {
                        const { color, label } = getZoneProps(zoneNum)
                        // Label positions for each corner
                        const labelPos = {
                            11: { x: SH * 0.6,              y: SH * 0.6              }, // top-left elbow
                            12: { x: W - SH * 0.6,          y: SH * 0.6              }, // top-right elbow
                            13: { x: SH * 0.6,              y: H - SH * 0.6          }, // bottom-left elbow
                            14: { x: W - SH * 0.6,          y: H - SH * 0.6          }, // bottom-right elbow
                        }
                        return (
                            <g key={zoneNum}>
                                <path
                                    d={CORNER_PATHS[zoneNum]}
                                    fill={color}
                                    stroke="#999"
                                    strokeWidth="1"
                                    strokeDasharray="4 3"
                                />
                                <text
                                    x={labelPos[zoneNum].x}
                                    y={labelPos[zoneNum].y - 10}
                                    textAnchor="middle"
                                    fontSize="9"
                                    fill="rgba(0,0,0,0.4)"
                                    fontWeight="700"
                                >
                                    {zoneNum}
                                </text>
                                <text
                                    x={labelPos[zoneNum].x}
                                    y={labelPos[zoneNum].y + 8}
                                    textAnchor="middle"
                                    fontSize="12"
                                    fill="#1a1a1a"
                                    fontWeight="700"
                                >
                                    {label}
                                </text>
                            </g>
                        )
                    })}

                    {/* Inner strike zone border */}
                    <rect
                        x={IX}
                        y={IY}
                        width={CELL * 3}
                        height={CELL * 3}
                        fill="none"
                        stroke="#333"
                        strokeWidth="3"
                    />

                    {/* Inner zone cells 1-9 */}
                    {Object.entries(INNER_RECTS).map(([zoneNum, rect]) => {
                        const { color, label } = getZoneProps(Number(zoneNum))
                        return (
                            <g key={zoneNum}>
                                <rect
                                    x={rect.x}
                                    y={rect.y}
                                    width={CELL}
                                    height={CELL}
                                    fill={color}
                                    stroke="rgba(0,0,0,0.12)"
                                    strokeWidth="1"
                                />
                                <text
                                    x={rect.x + CELL / 2}
                                    y={rect.y + CELL / 2 - 6}
                                    textAnchor="middle"
                                    fontSize="10"
                                    fill="rgba(0,0,0,0.3)"
                                    fontWeight="700"
                                >
                                    {zoneNum}
                                </text>
                                <text
                                    x={rect.x + CELL / 2}
                                    y={rect.y + CELL / 2 + 10}
                                    textAnchor="middle"
                                    fontSize="13"
                                    fill="#1a1a1a"
                                    fontWeight="700"
                                >
                                    {label}
                                </text>
                            </g>
                        )
                    })}
                </svg>
            )}
        </div>
    )
}

export default ZoneHeatMap