// src/components/player/PlayerHeader.jsx

function PlayerHeader({ playerName, playerId }) {
    return (
        <div>
            <h1>{playerName}</h1>
            <p>Player ID: {playerId}</p>
        </div>
    )
}

export default PlayerHeader