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

export const getBattingRankings = (playerId, season) => {
    return api.get('/league-context/rankings/batting', {
        params: { playerId, season }
    })
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

export const getBattingLeagueContext = (stat, seasons) => {
    // seasons is an array like [2016, 2017, 2018]
    // join to comma separated string for the query param
    return api.get('/league-context/batting', {
        params: {
            stat,
            seasons: seasons.join(',')
        }
    })
}

export const getStatcastSeason = (playerId, season) => {
    return api.get('/statcast/season', {
        params: { playerId, season }
    })
}

export const getStatcastRankings = (playerId, season) => {
    return api.get('/statcast/rankings', {
        params: { playerId, season }
    })
}

export const getStatcastZones = (playerId, season) => {
    return api.get('/statcast/zones', {
        params: { playerId, season }
    })
}

export const getStatDistribution = (stat, seasons) => {
    return api.get('/league-context/distribution', {
        params: { stat, seasons: seasons.join(',') }
    })
}