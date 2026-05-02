// src/App.jsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import BattingLeaderboard from './pages/BattingLeaderboard'
import PlayerProfile from './pages/PlayerProfile'
import './App.css'

function App() {
    return (
        <BrowserRouter>
            <div className="app-container">
                <nav className="nav">
                    <Link to="/">Leaderboard</Link>
                    <Link to="/player">Player Profile</Link>
                </nav>

                <div className="page-content">
                    <Routes>
                        <Route path="/" element={<BattingLeaderboard />} />
                        <Route path="/player" element={<PlayerProfile />} />
                    </Routes>
                </div>
            </div>
        </BrowserRouter>
    )
}

export default App