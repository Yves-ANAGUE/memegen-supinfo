import rateLimit from 'express-rate-limit'

export const limiteurIA = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 5,                 // 5 appels IA max par IP par minute
  message: { erreur: 'Trop de requêtes. Réessaie dans une minute.' },
  standardHeaders: true,
  legacyHeaders: false,
})