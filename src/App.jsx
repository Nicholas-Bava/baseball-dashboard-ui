// src/App.jsx
// Main application shell and router.
// - Uses react-router to switch between pages.
// - Contains a simple nav with Links and a Routes block that renders pages.
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import BattingLeaderboard from './pages/BattingLeaderboard'
import PlayerProfile from './pages/PlayerProfile'
import './App.css'

function App() {
    // The App component is the top-level React component for this SPA.
    // It wraps the UI in a <BrowserRouter> so we can use client-side routes.
    // The <Link> components change the URL without a full page reload.
    // The <Routes> component maps paths to page components.
    return (
        <BrowserRouter>
            <div className="app-container">
                {/* Navigation bar with in-app links */}
                <nav className="nav">
                    <Link to="/">Leaderboard</Link>
                    <Link to="/player">Player Profile</Link>
                </nav>

                {/* page-content is where route-matched pages are rendered */}
                <div className="page-content">
                    <Routes>
                        {/* Root shows the batting leaderboard */}
                        <Route path="/" element={<BattingLeaderboard />} />
                        {/* /player shows the player profile page */}
                        <Route path="/player" element={<PlayerProfile />} />
                    </Routes>
                </div>
            </div>
        </BrowserRouter>
    )
}

export default App