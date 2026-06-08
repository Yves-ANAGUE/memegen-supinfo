import express from 'express'
import cors from 'cors'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import routeurIA from './routes/ia.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Charge .env uniquement en développement local
if (process.env.NODE_ENV !== 'production') {
  try {
    const lignes = readFileSync(join(__dirname, '.env'), 'utf8').split('\n')
    for (const ligne of lignes) {
      const propre = ligne.trim()
      if (!propre || propre.startsWith('#')) continue
      const idx    = propre.indexOf('=')
      if (idx === -1) continue
      const cle    = propre.substring(0, idx).trim()
      const valeur = propre.substring(idx + 1).trim()
      if (cle) process.env[cle] = valeur
    }
  } catch {}
}

const appli = express()
const port  = process.env.PORT || 3001

// CORS strict — accepte localhost en dev, URL Vercel en prod
const originesAutorisees = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean)

appli.use(cors({
  origin: (origin, callback) => {
    // Autorise les appels sans origin (Postman, curl)
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

appli.listen(port, () => {
  console.log(`Backend démarré — port ${port} — env ${process.env.NODE_ENV ?? 'development'}`)
})