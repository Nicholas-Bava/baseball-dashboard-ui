// src/App.jsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import BattingLeaderboard from './pages/BattingLeaderboard'
import PlayerProfile from './pages/PlayerProfile'

function App() {
    return (
        <BrowserRouter>
            {/* Navigation bar - visible on every page */}
            <nav>
                <Link to="/">Leaderboard</Link>
                <Link to="/player">Player Profile</Link>
            </nav>

            {/* Routes - only one renders at a time based on the URL */}
            <Routes>
                <Route path="/" element={<BattingLeaderboard />} />
                <Route path="/player" element={<PlayerProfile />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App