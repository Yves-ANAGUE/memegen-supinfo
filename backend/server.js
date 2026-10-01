// backend/server.js
import express from 'express'
import cors from 'cors'
import routeurIA from './routes/ia.js'

const appli = express()
appli.set('trust proxy', 1)

// CORS strict
const originesAutorisees = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean)

appli.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (originesAutorisees.includes(origin)) return callback(null, true)
    callback(new Error(`CORS bloqué pour : ${origin}`))
  },
  credentials: true,
}))

appli.use(express.json({ limit: '10mb' }))
appli.use('/api', routeurIA)

appli.get('/health', (_req, res) => res.json({
  statut: 'ok',
  env: process.env.NODE_ENV,
  groq: process.env.GROQ_API_KEY ? 'configurée' : 'MANQUANTE',
}))

// CRUCIAL : export par défaut pour Vercel
// Retire complètement le bloc appli.listen(...)
export default appli