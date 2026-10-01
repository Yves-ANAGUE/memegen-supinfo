import { Router } from 'express'
import Groq from 'groq-sdk'
import https from 'https'
import { limiteurIA } from '../middlewares/rateLimiter.js'

const routeur = Router()

// ─────────────────────────────────────────────────────────────
// MODÈLE VISION PRINCIPAL
// Modifie cette constante si Groq change de modèle.
// Le code tentera celui-ci en premier, puis basculera
// automatiquement sur la détection dynamique en cas d'échec.
// ─────────────────────────────────────────────────────────────
const MODELE_VISION_PRINCIPAL = 'qwen/qwen3.8-27b'

// Cache du modèle vision détecté dynamiquement
let modeleVisionDetecte = null
let modeleVisionExpire = 0
const DUREE_CACHE_MS = 60 * 60 * 1000 // 1 heure

/**
 * Cherche dynamiquement un modèle Groq acceptant les images (input_modalities: "image").
 * Utilisé en fallback si MODELE_VISION_PRINCIPAL échoue.
 */
async function detecterModeleVision(clientGroq) {
  if (modeleVisionDetecte && Date.now() < modeleVisionExpire) {
    return modeleVisionDetecte
  }

  try {
    const reponse = await clientGroq.models.list()
    const modeles = reponse?.data ?? []

    const modelesVision = modeles.filter(
      (m) =>
        m.active !== false &&
        Array.isArray(m.input_modalities) &&
        m.input_modalities.includes('image')
    )

    if (modelesVision.length === 0) return null

    // Priorité à qwen, sinon premier disponible
    const choisi =
      modelesVision.find((m) => m.id.includes('qwen')) ?? modelesVision[0]

    modeleVisionDetecte = choisi.id
    modeleVisionExpire = Date.now() + DUREE_CACHE_MS
    console.log(`[Groq] Modèle vision détecté dynamiquement : ${choisi.id}`)
    return choisi.id
  } catch (err) {
    console.error('[Groq] Échec détection dynamique :', err.message)
    return null
  }
}

/**
 * Tente une complétion avec un modèle donné.
 * Retourne { ok: true, completion } ou { ok: false, erreur, status }.
 */
async function tenterCompletion(clientGroq, modele, messages) {
  try {
    const completion = await clientGroq.chat.completions.create({
      model: modele,
      max_tokens: 300,
      messages,
    })
    return { ok: true, completion }
  } catch (err) {
    return { ok: false, erreur: err, status: err?.status }
  }
}

// ─────────────────────────────────────────────────────────────
// Route principale
// ─────────────────────────────────────────────────────────────
routeur.post('/suggerer-legendes', limiteurIA, async (req, res) => {
  const agentIdia = new https.Agent({ keepAlive: true })

  const clientGroq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
    httpAgent: agentIdia,
  })

  const { imageBase64 } = req.body

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ erreur: 'imageBase64 manquant ou invalide.' })
  }
  if (!imageBase64.startsWith('data:image/')) {
    return res.status(400).json({ erreur: "Format d'image non reconnu." })
  }

  const [entete, donneesBrutes] = imageBase64.split(',')
  const typeMime = entete.match(/data:(image\/[^;]+)/)?.[1]

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(typeMime)) {
    return res.status(400).json({ erreur: 'Format non supporté.' })
  }

  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:${typeMime};base64,${donneesBrutes}` },
        },
        {
          type: 'text',
          text: `Analyse cette image et génère exactement 3 légendes humoristiques pour un mème.
Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans explication.
Format strict : {"legendes": ["légende1", "légende2", "légende3"]}`,
        },
      ],
    },
  ]

  try {
    // ─────────────────────────────────────────
    // ÉTAPE 1 : modèle principal défini en dur
    // ─────────────────────────────────────────
    const modelePrincipal = process.env.GROQ_MODEL || MODELE_VISION_PRINCIPAL
    console.log(`[Groq] Tentative avec modèle principal : ${modelePrincipal}`)

    let resultat = await tenterCompletion(clientGroq, modelePrincipal, messages)

    // ─────────────────────────────────────────
    // ÉTAPE 2 : fallback détection dynamique si 404 ou modèle disparu
    // ─────────────────────────────────────────
    if (!resultat.ok && (resultat.status === 404 || resultat.status === 400)) {
      console.warn(
        `[Groq] Modèle ${modelePrincipal} indisponible (${resultat.status}), bascule en détection dynamique.`
      )

      const modeleFallback = await detecterModeleVision(clientGroq)

      if (modeleFallback && modeleFallback !== modelePrincipal) {
        console.log(`[Groq] Nouvelle tentative avec : ${modeleFallback}`)
        resultat = await tenterCompletion(clientGroq, modeleFallback, messages)
      }
    }

    // ─────────────────────────────────────────
    // Gestion finale des erreurs
    // ─────────────────────────────────────────
    if (!resultat.ok) {
      const err = resultat.erreur
      if (err?.status === 429) {
        return res.status(429).json({
          erreur: 'Limite API Groq atteinte. Réessaie dans quelques secondes.',
        })
      }
      console.error('[Groq]', err?.message ?? 'Erreur inconnue')
      return res.status(500).json({
        erreur: "Erreur lors de l'analyse de l'image.",
      })
    }

    // ─────────────────────────────────────────
    // Parsing de la réponse
    // ─────────────────────────────────────────
    const contenuBrut = resultat.completion.choices[0]?.message?.content ?? ''
    let legendes

    try {
      legendes = JSON.parse(contenuBrut).legendes
      if (!Array.isArray(legendes) || legendes.length !== 3) throw new Error()
    } catch {
      const match = contenuBrut.match(/\{[\s\S]*\}/)
      legendes = match
        ? JSON.parse(match[0]).legendes
        : ['Légende 1', 'Légende 2', 'Légende 3']
    }

    return res.json({ legendes })
  } catch (err) {
    if (err?.status === 429) {
      return res.status(429).json({
        erreur: 'Limite API Groq atteinte. Réessaie dans quelques secondes.',
      })
    }
    console.error('[Groq]', err.message)
    return res.status(500).json({
      erreur: "Erreur lors de l'analyse de l'image.",
    })
  }
})

export default routeur