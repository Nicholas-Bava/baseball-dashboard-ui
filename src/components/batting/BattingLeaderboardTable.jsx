// src/components/batting/BattingLeaderboardTable.jsx
// Simple presentational table that lists top batters for a season.
// Props:
// - data: array of player objects. Each object should contain keys like playerName, season, homeRuns, rbi, avg.
// This component is intentionally small and only responsible for rendering the provided data.
import { useState } from 'react'

function BattingLeaderboardTable({ data }) {
    // If `data` is null/undefined we assume the parent is still fetching and show a loading state.
    if (!data) {
        return <p>Loading...</p>
    }

    // If the API returned an empty array, show a friendly message.
    if (data.length === 0) {
        return <p>No data found.</p>
    }

    // Otherwise map each player to a table row. We use the `index` as the key here because
    // the leaderboard is a small, static list for display purposes. For large or dynamic lists
    // prefer a stable unique id (e.g. playerId) as the key.
    return (
        <table>
            <thead>
            <tr>
                <th>Player</th>
                <th>Season</th>
                <th>HR</th>
                <th>RBI</th>
                <th>AVG</th>
            </tr>
            </thead>
            <tbody>
            {data.map((player, index) => (
                <tr key={index}>
                    <td>{player.playerName}</td>
                    <td>{player.season}</td>
                    <td>{player.homeRuns}</td>
                    <td>{player.rbi}</td>
                    <td>{player.avg}</td>
                </tr>
            ))}
            </tbody>
        </table>
    )
}

export default BattingLeaderboardTable