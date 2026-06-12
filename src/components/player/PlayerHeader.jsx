// src/components/player/PlayerHeader.jsx
// Small presentational component that shows a player's name and id.
// Props:
// - playerName: string
// - playerId: numeric or string id
function PlayerHeader({ playerName, playerId }) {
    return (
        <div>
            {/* Player name — displayed prominently */}
            <h1>{playerName}</h1>
            {/* Player id — useful for debugging or referencing in API calls */}
            <p>Player ID: {playerId}</p>
        </div>
    )
}

export default PlayerHeader