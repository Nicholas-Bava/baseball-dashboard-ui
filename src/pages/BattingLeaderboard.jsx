// src/pages/BattingLeaderboard.jsx

// We need useState to store the data and useEffect to fetch it on load
import { useState, useEffect } from 'react'

// Import our API function from the api layer we built
import { getBattingLeaderboard } from '../api/baseballApi'

// Import the table component we just built
import BattingLeaderboardTable from '../components/batting/BattingLeaderboardTable'

function BattingLeaderboard() {

    // Three pieces of state:
    // 'players' stores the data from Flask - starts as null (nothing loaded yet)
    // 'season' stores which season the user wants - starts as 2024
    // 'error' stores any error message if the Flask call fails
    const [players, setPlayers] = useState(null)
    const [season, setSeason] = useState(2024)
    const [error, setError] = useState(null)

    // useEffect runs when the component loads AND whenever 'season' changes
    // The [season] at the end is called the dependency array
    // It tells React "re-run this effect whenever season changes"
    useEffect(() => {

        // Reset players to null so the Loading message shows while fetching
        setPlayers(null)

        // Call Flask via our API layer
        getBattingLeaderboard('homeRuns', season, 25)
            .then(response => {
                // response.data is the JSON array Flask sent back
                setPlayers(response.data)
            })
            .catch(err => {
                // If something went wrong store the error message
                setError('Failed to load leaderboard')
                console.error(err)
            })

    }, [season]) // re-runs whenever season changes

    return (
        <div>
            <h1>Batting Leaderboard</h1>

            {/* Season selector - lets user switch between years */}
            <div>
                <label>Season: </label>
                <select
                    value={season}
                    onChange={(e) => setSeason(Number(e.target.value))}
                >
                    <option value={2022}>2022</option>
                    <option value={2023}>2023</option>
                    <option value={2024}>2024</option>
                </select>
            </div>

            {/* Show error if something went wrong */}
            {error && <p>{error}</p>}

            {/* Pass the players data down to the table component as a prop */}
            <BattingLeaderboardTable data={players} />
        </div>
    )
}

export default BattingLeaderboard