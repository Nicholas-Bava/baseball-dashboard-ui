// src/components/batting/BattingLeaderboardTable.jsx

// We import React's useState and useEffect hooks at the top of every component file
import { useState } from 'react'

// This component receives 'data' as a prop - an array of player objects from Flask
function BattingLeaderboardTable({ data }) {

    // If no data has arrived yet, show a loading message
    if (!data) {
        return <p>Loading...</p>
    }

    // If the array is empty, tell the user
    if (data.length === 0) {
        return <p>No data found.</p>
    }

    // Otherwise render the table
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