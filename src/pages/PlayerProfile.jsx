// src/pages/PlayerProfile.jsx
import { useState } from 'react'
import { getPlayerProfile, searchPlayers } from '../api/baseballApi'
import PlayerHeader from '../components/player/PlayerHeader'
import CareerStatsTable from '../components/player/CareerStatsTable'
import CareerStatChart from '../components/player/CareerStatChart'
import SeasonModal from '../components/player/SeasonModal'
import CareerDistributionChart from '../components/player/CareerDistributionChart'

function PlayerProfile() {

    // What the user is typing in the search box
    const [searchInput, setSearchInput] = useState('')

    // The actual player data from Flask
    const [profileData, setProfileData] = useState(null)

    // Whether we are waiting for Flask to respond
    const [loading, setLoading] = useState(false)

    // Any error message
    const [error, setError] = useState(null)

    // Selected season for drill through
    const [selectedSeason, setSelectedSeason] = useState(null)

    const [selectedStat, setSelectedStat] = useState('homeRuns')

    // Temporary debug
    console.log('selected season:', selectedSeason)
    console.log('selected stat:', selectedStat)

    // Called when the user hits the Search button
    const handleSearch = () => {

        // Don't search if the box is empty
        if (!searchInput.trim()) return

        // Reset state before new search
        setLoading(true)
        setError(null)
        setProfileData(null)

        // Call Flask
        getPlayerProfile(searchInput, 'batting')
            .then(response => {
                // Check if the profile has any batting data
                if (!response.data.batting || response.data.batting.length === 0) {
                    setError('No batting data found for this player.')
                } else {
                    setProfileData(response.data)
                }
            })
            .catch(() => {
                setError('Player not found. Check the spelling and try again.')
            })
            .finally(() => {
                // Always stop loading when the call finishes
                setLoading(false)
            })
    }

    // Called on every keystroke in the search box
    const handleKeyDown = (e) => {
        // Allow user to press Enter instead of clicking the button
        if (e.key === 'Enter') handleSearch()
    }

    return (
        <div>
            <h1>Player Profile</h1>

            {/* Search bar */}
            <div>
                <input
                    type="text"
                    placeholder="Search player name..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button onClick={handleSearch}>Search</button>
            </div>

            {/* Loading state */}
            {loading && <p>Loading...</p>}

            {/* Error state */}
            {error && <p>{error}</p>}

            {/* Player data - only renders when profileData exists */}
            {profileData && (
                <div>
                    <PlayerHeader
                        playerName={profileData.playerName}
                        playerId={profileData.playerId}
                    />

                    {/* Top row — chart left, stats table right */}
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                        <div style={{ flex: '0 0 55%' }}>
                            <CareerStatChart
                                batting={profileData.batting}
                                playerName={profileData.playerName}
                                selectedStat={selectedStat}
                                onStatChange={setSelectedStat}
                            />
                        </div>
                        <div style={{ flex: '1', overflowX: 'auto' }}>
                            <CareerStatsTable
                                batting={profileData.batting}
                                onSeasonClick={(season) => setSelectedSeason(season)}
                            />
                        </div>
                    </div>

                    {/* Full width heat map below */}
                    <div style={{ marginTop: '24px' }}>
                        <CareerDistributionChart
                            batting={profileData.batting}
                            playerName={profileData.playerName}
                            selectedStat={selectedStat}
                            onStatChange={setSelectedStat}
                        />
                    </div>

                    {selectedSeason && (
                        <SeasonModal
                            season={selectedSeason}
                            playerName={profileData.playerName}
                            onClose={() => setSelectedSeason(null)}
                        />
                    )}
                </div>
            )}
        </div>
    )
}

export default PlayerProfile