// src/pages/PlayerProfile.jsx
// Page that lets the user search for a player and view career visualizations and tables.
// High level flow:
// - User types a name and clicks Search -> calls getPlayerProfile
// - If successful, profileData contains a playerName, playerId and batting[] array
// - The page renders multiple child components (header, stat chart, stats table, distribution)
// Props: none (this is a page-level component)
import { useState } from 'react'
import { getPlayerProfile } from '../api/baseballApi'
import PlayerHeader from '../components/player/PlayerHeader'
import CareerStatsTable from '../components/player/CareerStatsTable'
import CareerStatChart from '../components/player/CareerStatChart'
import SeasonModal from '../components/player/SeasonModal'
import CareerDistributionChart from '../components/player/CareerDistributionChart'

function PlayerProfile() {

    // searchInput: controlled input for the player's name
    const [searchInput, setSearchInput] = useState('')

    // profileData: object returned from API containing playerName, playerId and batting array
    const [profileData, setProfileData] = useState(null)

    // loading and error states for the search call
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // When the user clicks a season row we store it here to open the SeasonModal
    const [selectedSeason, setSelectedSeason] = useState(null)

    // The stat currently selected across charts (e.g. 'homeRuns')
    const [selectedStat, setSelectedStat] = useState('homeRuns')

    // Debug logs (safe to remove once you understand flow)
    console.log('selected season:', selectedSeason)
    console.log('selected stat:', selectedStat)

    // Called when the user hits the Search button. We validate the input, set loading,
    // call the API and then update state based on the response.
    const handleSearch = () => {
        if (!searchInput.trim()) return

        setLoading(true)
        setError(null)
        setProfileData(null)

        getPlayerProfile(searchInput, 'batting')
            .then(response => {
                // Ensure there is batting data before rendering the player UI
                if (!response.data.batting || response.data.batting.length === 0) {
                    setError('No batting data found for this player.')
                } else {
                    setProfileData(response.data)
                }
            })
            .catch(() => {
                setError('Player not found. Check the spelling and try again.')
            })
            .finally(() => setLoading(false))
    }

    // Support pressing Enter in the search input
    const handleKeyDown = (e) => {
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

            {/* Loading and error states */}
            {loading && <p>Loading...</p>}
            {error && <p>{error}</p>}

            {/* When profileData is present render the header, charts and tables */}
            {profileData && (
                <div>
                    <PlayerHeader
                        playerName={profileData.playerName}
                        playerId={profileData.playerId}
                    />

                    {/* Top row: career stat chart on the left and the raw stats table on the right */}
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

                    {/* Full-width career distribution heatmap/violin chart */}
                    <div style={{ marginTop: '24px' }}>
                        <CareerDistributionChart
                            batting={profileData.batting}
                            playerName={profileData.playerName}
                            selectedStat={selectedStat}
                            onStatChange={setSelectedStat}
                        />
                    </div>

                    {/* Show the modal when a season row is selected */}
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