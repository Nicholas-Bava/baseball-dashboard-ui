// src/pages/PlayerProfile.jsx
import { useState } from 'react'
import { getPlayerProfile, searchPlayers } from '../api/baseballApi'
import PlayerHeader from '../components/player/PlayerHeader'
import CareerStatsTable from '../components/player/CareerStatsTable'
import CareerStatChart from '../components/player/CareerStatChart'

function PlayerProfile() {

    // What the user is typing in the search box
    const [searchInput, setSearchInput] = useState('')

    // The actual player data from Flask
    const [profileData, setProfileData] = useState(null)

    // Whether we are waiting for Flask to respond
    const [loading, setLoading] = useState(false)

    // Any error message
    const [error, setError] = useState(null)

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

                    {/* Two column layout */}
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

                        {/* Left half - chart */}
                        <div style={{ width: '50%' }}>
                            <CareerStatChart batting={profileData.batting} />
                        </div>

                        {/* Right half - placeholder for now */}
                        <div style={{ width: '50%' }}>
                        </div>

                    </div>

                    {/* Table full width below */}
                    <CareerStatsTable batting={profileData.batting} />
                </div>
            )}
        </div>
    )
}

export default PlayerProfile