import { Router } from 'express'
import Groq from 'groq-sdk'
import { limiteurIA } from '../middlewares/rateLimiter.js'

const routeur    = Router()

routeur.post('/suggerer-legendes', limiteurIA, async (req, res) => {
  // Instancie Groq ici pour toujours prendre la clé courante
  const clientGroq = new Groq({ apiKey: process.env.GROQ_API_KEY })

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

  try {
    const completion = await clientGroq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${typeMime};base64,${donneesBrutes}` }
            },
            {
              type: 'text',
              text: `Analyse cette image et génère exactement 3 légendes humoristiques pour un mème.
Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans explication.
Format strict : {"legendes": ["légende1", "légende2", "légende3"]}`
            }
          ]
        }
      ]
    })

    const contenuBrut = completion.choices[0]?.message?.content ?? ''
    let legendes

    try {
      legendes = JSON.parse(contenuBrut).legendes
      if (!Array.isArray(legendes) || legendes.length !== 3) throw new Error()
    } catch {
      const match = contenuBrut.match(/\{[\s\S]*\}/)
      legendes = match ? JSON.parse(match[0]).legendes : ['Légende 1', 'Légende 2', 'Légende 3']
    }

    return res.json({ legendes })
  } catch (err) {
    if (err?.status === 429) {
      return res.status(429).json({ erreur: 'Limite API Groq atteinte. Réessaie dans quelques secondes.' })
    }
    console.error('[Groq]', err.message)
    return res.status(500).json({ erreur: "Erreur lors de l'analyse de l'image." })
  }
})

export default routeur