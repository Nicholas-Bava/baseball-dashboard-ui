// src/api/baseballApi.js
import axios from 'axios'

// This is the base URL of your Flask backend
// Every request we make will start with this
const BASE_URL = 'http://127.0.0.1:5000/api'

// Create an axios instance with that base URL baked in
// So instead of typing the full URL every time, we just use api.get('/batting/leaderboard')
const api = axios.create({
    baseURL: BASE_URL
})

// Batting endpoints
export const getBattingLeaderboard = (stat = 'homeRuns', season = null, limit = 25) => {
    return api.get('/batting/leaderboard', {
        params: { stat, season, limit }
    })
}

export const getBattingPlayerCareer = (playerName) => {
    return api.get(`/batting/player/${playerName}`)
}

export const getBattingSeasonSummary = (year) => {
    return api.get(`/batting/season/${year}`)
}

// Pitching endpoints
export const getPitchingLeaderboard = (stat = 'era', season = null, limit = 25) => {
    return api.get('/pitching/leaderboard', {
        params: { stat, season, limit }
    })
}

export const getPitchingPlayerCareer = (playerName) => {
    return api.get(`/pitching/player/${playerName}`)
}

// Player endpoints
export const searchPlayers = (query) => {
    return api.get('/players/search', {
        params: { q: query }
    })
}

export const getPlayerProfile = (playerName) => {
    return api.get(`/players/${playerName}`)
}