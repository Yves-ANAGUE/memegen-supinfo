import { useEffect, useRef, useReducer, useCallback } from 'react'
import { fabric } from 'fabric'
import { supabase } from '../lib/supabaseClient'

const FORMATS_ACCEPTES = ['image/jpeg', 'image/png', 'image/webp']
const TAILLE_MAX_MO = 5
const LARGEUR_CANVAS = 680
const HAUTEUR_CANVAS = 440

function reducteurEditeur(etat, action) {
  switch (action.type) {
    case 'SET_CHARGEMENT': return { ...etat, chargement: action.valeur }
    case 'SET_LEGENDES':   return { ...etat, legendes: action.legendes }
    case 'SET_ERREUR':     return { ...etat, erreur: action.message, succes: null }
    case 'SET_SUCCES':     return { ...etat, succes: action.message, erreur: null }
    case 'SET_PARTAGE':    return { ...etat, afficherPartage: action.valeur }
    default: return etat
  }
}

function dataUrlVersBlob(dataUrl) {
  const [entete, donnees] = dataUrl.split(',')
  const typeMime = entete.match(/:(.*?);/)[1]
  const binaire  = atob(donnees)
  const tableau  = new Uint8Array(binaire.length)
  for (let i = 0; i < binaire.length; i++) tableau[i] = binaire.charCodeAt(i)
  return new Blob([tableau], { type: typeMime })
}

function redimensionnerImage(fichier, largeurMax = 900) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(fichier)
    img.onload = () => {
      const ratio     = Math.min(1, largeurMax / img.width)
      const offscreen = document.createElement('canvas')
      offscreen.width  = img.width  * ratio
      offscreen.height = img.height * ratio
      offscreen.getContext('2d').drawImage(img, 0, 0, offscreen.width, offscreen.height)
      URL.revokeObjectURL(url)
      resolve(offscreen.toDataURL('image/jpeg', 0.88))
    }
    img.onerror = reject
    img.src = url
  })
}

export default function Editeur({ onSauvegarde }) {
  const refCanvas   = useRef(null)
  const refInstance = useRef(null)
  const [etat, dispatch] = useReducer(reducteurEditeur, {
    chargement: false, legendes: [], erreur: null, succes: null, afficherPartage: false,
  })

  useEffect(() => {
    const instance = new fabric.Canvas(refCanvas.current, {
      width: LARGEUR_CANVAS,
      height: HAUTEUR_CANVAS,
      backgroundColor: '#1a1a2e',
      selection: true,
    })
    refInstance.current = instance

    function gererTouche(e) {
      if ((e.key === 'Delete' || e.key === 'Backspace')
          && e.target.tagName !== 'INPUT'
          && e.target.tagName !== 'TEXTAREA') {
        const actif = instance.getActiveObject()
        if (actif && !actif.isEditing) {
          instance.remove(actif)
          instance.discardActiveObject()
          instance.renderAll()
        }
      }
    }
    window.addEventListener('keydown', gererTouche)
    return () => {
      window.removeEventListener('keydown', gererTouche)
      instance.dispose()
    }
  }, [])

  // Écoute l'événement de réouverture depuis la galerie
useEffect(() => {
  function gererChargementMeme(e) {
    const canvas = refInstance.current
    if (!canvas) return
    fabric.Image.fromURL(e.detail.url, (img) => {
      canvas.clear()
      canvas.backgroundColor = '#1a1a2e'
      const scale = Math.min(LARGEUR_CANVAS / img.width, HAUTEUR_CANVAS / img.height)
      img.set({
        scaleX: scale, scaleY: scale,
        left: (LARGEUR_CANVAS - img.width  * scale) / 2,
        top:  (HAUTEUR_CANVAS - img.height * scale) / 2,
        selectable: true, hasControls: true, _isImageFond: true,
      })
      canvas.add(img)
      canvas.sendToBack(img)
      canvas.renderAll()
    }, { crossOrigin: 'anonymous' })
  }
  window.addEventListener('charger-meme', gererChargementMeme)
  return () => window.removeEventListener('charger-meme', gererChargementMeme)
}, [])

  const chargerImage = useCallback(async (e) => {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    if (!FORMATS_ACCEPTES.includes(fichier.type)) {
      dispatch({ type: 'SET_ERREUR', message: 'Format non supporté (JPEG, PNG, WebP).' })
      return
    }
    if (fichier.size > TAILLE_MAX_MO * 1024 * 1024) {
      dispatch({ type: 'SET_ERREUR', message: `Fichier trop lourd (max ${TAILLE_MAX_MO} Mo).` })
      return
    }
    const canvas  = refInstance.current
    const dataUrl = await redimensionnerImage(fichier)

    fabric.Image.fromURL(dataUrl, (img) => {
      canvas.getObjects().filter(o => o._isImageFond).forEach(o => canvas.remove(o))
      const scale = Math.min(LARGEUR_CANVAS / img.width, HAUTEUR_CANVAS / img.height)
      img.set({
        scaleX: scale, scaleY: scale,
        left: (LARGEUR_CANVAS  - img.width  * scale) / 2,
        top:  (HAUTEUR_CANVAS - img.height * scale) / 2,
        selectable: true, hasControls: true, _isImageFond: true,
      })
      canvas.add(img)
      canvas.sendToBack(img)
      canvas.setActiveObject(img)
      canvas.renderAll()
    }, { crossOrigin: 'anonymous' })
  }, [])

  // Charge une image depuis une URL (pour rouvrir une création)
  const chargerDepuisUrl = useCallback((url) => {
    const canvas = refInstance.current
    if (!canvas) return
    fabric.Image.fromURL(url, (img) => {
      canvas.clear()
      canvas.backgroundColor = '#1a1a2e'
      const scale = Math.min(LARGEUR_CANVAS / img.width, HAUTEUR_CANVAS / img.height)
      img.set({
        scaleX: scale, scaleY: scale,
        left: (LARGEUR_CANVAS  - img.width  * scale) / 2,
        top:  (HAUTEUR_CANVAS - img.height * scale) / 2,
        selectable: true, hasControls: true, _isImageFond: true,
      })
      canvas.add(img)
      canvas.sendToBack(img)
      canvas.renderAll()
    }, { crossOrigin: 'anonymous' })
  }, [])

  const ajouterTexte = useCallback(() => {
    const canvas = refInstance.current
    if (!canvas) return
    const texte = new fabric.IText('Ton texte 😄', {
      left: 60, top: 60,
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: 44, fill: '#ffffff',
      stroke: '#000000', strokeWidth: 1.5, paintFirst: 'stroke',
    })
    canvas.add(texte)
    canvas.setActiveObject(texte)
    canvas.renderAll()
  }, [])

  const supprimerSelection = useCallback(() => {
    const canvas = refInstance.current
    if (!canvas) return
    const actif = canvas.getActiveObject()
    if (actif) { canvas.remove(actif); canvas.discardActiveObject(); canvas.renderAll() }
  }, [])

  const suggererParIA = useCallback(async () => {
    const canvas = refInstance.current
    if (!canvas) return
    dispatch({ type: 'SET_CHARGEMENT', valeur: true })
    dispatch({ type: 'SET_LEGENDES', legendes: [] })
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.65)
    try {
      const rep = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/suggerer-legendes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      })
      if (!rep.ok) { const d = await rep.json(); throw new Error(d.erreur || 'Erreur serveur') }
      const { legendes } = await rep.json()
      dispatch({ type: 'SET_LEGENDES', legendes })
    } catch (err) {
      dispatch({ type: 'SET_ERREUR', message: err.message })
    } finally {
      dispatch({ type: 'SET_CHARGEMENT', valeur: false })
    }
  }, [])

  const appliquerLegende = useCallback((legende) => {
    const canvas = refInstance.current
    if (!canvas) return
    const texte = new fabric.IText(legende, {
      left: 20, top: HAUTEUR_CANVAS - 95,
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: 40, fill: '#ffffff',
      stroke: '#000000', strokeWidth: 1.5, paintFirst: 'stroke',
    })
    canvas.add(texte)
    canvas.setActiveObject(texte)
    canvas.renderAll()
  }, [])

  const telechargerMeme = useCallback(() => {
    const canvas = refInstance.current
    if (!canvas) return
    // Désélectionne avant export pour ne pas capturer les poignées
    canvas.discardActiveObject()
    canvas.renderAll()
    const lien = document.createElement('a')
    lien.download = `meme-${Date.now()}.png`
    lien.href = canvas.toDataURL('image/png')
    lien.click()
  }, [])

  const ouvrirPartage = useCallback(async () => {
    const canvas = refInstance.current
    if (!canvas) return
    canvas.discardActiveObject()
    canvas.renderAll()
    const dataUrl = canvas.toDataURL('image/png')
    const blob    = dataUrlVersBlob(dataUrl)
    const fichier = new File([blob], 'meme.png', { type: 'image/png' })
    if (navigator.canShare?.({ files: [fichier] })) {
      try { await navigator.share({ files: [fichier], title: 'Mon mème', text: 'Créé avec MemeGen IA 🎭' }); return } catch {}
    }
    telechargerMeme()
    dispatch({ type: 'SET_PARTAGE', valeur: true })
  }, [telechargerMeme])

  const sauvegarderMeme = useCallback(async (estPublic = false) => {
  const canvas = refInstance.current
  if (!canvas) return

  dispatch({ type: 'SET_CHARGEMENT', valeur: true })
  dispatch({ type: 'SET_ERREUR', message: null })

  const tenterSauvegarde = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Tu dois être connecté.')
    const uid = session.user.id

    canvas.discardActiveObject()
    canvas.renderAll()

    const canvasNatif = canvas.toCanvasElement()
    const dataUrl     = canvasNatif.toDataURL('image/png')
    const blob        = dataUrlVersBlob(dataUrl)
    const nomFichier  = `${uid}/${Date.now()}.png`

    const { error: errStorage } = await supabase.storage
      .from('memes-images')
      .upload(nomFichier, blob, { contentType: 'image/png' })
    if (errStorage) throw new Error(`Storage : ${errStorage.message}`)

    const { data: { publicUrl } } = supabase.storage
      .from('memes-images').getPublicUrl(nomFichier)

    const { error: errDB } = await supabase.from('memes')
      .insert({ utilisateur_id: uid, url_image: publicUrl, est_public: estPublic })
    if (errDB) throw new Error(`Base de données : ${errDB.message}`)

    return publicUrl
  }

  try {
    await tenterSauvegarde()
    dispatch({ type: 'SET_SUCCES', message: estPublic ? '🌐 Publié dans la galerie !' : '🔒 Sauvegardé !' })
    onSauvegarde?.()
  } catch (err) {
    // Retry automatique une seule fois si erreur transitoire
    if (err.message.includes('Storage') || err.message.includes('fetch')) {
      try {
        await new Promise(r => setTimeout(r, 2000)) // attend 2s
        await tenterSauvegarde()
        dispatch({ type: 'SET_SUCCES', message: estPublic ? '🌐 Publié !' : '🔒 Sauvegardé !' })
        onSauvegarde?.()
      } catch (err2) {
        dispatch({ type: 'SET_ERREUR', message: err2.message })
      }
    } else {
      dispatch({ type: 'SET_ERREUR', message: err.message })
    }
  } finally {
    dispatch({ type: 'SET_CHARGEMENT', valeur: false })
  }
}, [onSauvegarde])

  return (
    <div style={styles.conteneur}>
      <div style={styles.zoneCanvas}>
        <div style={styles.canvasWrapper}>
          <canvas ref={refCanvas} style={{ borderRadius: 10, display: 'block', maxWidth: '100%' }} />
        </div>
        <p style={styles.aide}>
          Sélectionne l'image pour la recadrer ·{' '}
          <kbd style={styles.kbd}>Delete</kbd> supprime ·{' '}
          Double-clic édite le texte
        </p>
      </div>

      <div style={styles.panneau} onClick={e => e.stopPropagation()}>
        <Section titre="📁 Image">
          <label style={styles.boutonUpload}>
            📂 Choisir une image
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chargerImage} style={{ display: 'none' }} />
          </label>
        </Section>

        <Section titre="✏️ Texte">
          <Btn onClick={ajouterTexte}>+ Ajouter du texte</Btn>
          <Btn onClick={supprimerSelection} variante="danger">🗑 Supprimer la sélection</Btn>
        </Section>

        <Section titre="🤖 IA Groq Vision">
          <Btn onClick={suggererParIA} disabled={etat.chargement} variante="ia">
            {etat.chargement ? '⏳ Analyse en cours…' : '✨ Suggérer des légendes'}
          </Btn>
          {etat.legendes.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <p style={styles.legendesHint}>Clique pour ajouter au canvas :</p>
              {etat.legendes.map((leg, i) => (
                <button type="button" key={i}
                  onClick={(e) => { e.stopPropagation(); appliquerLegende(leg) }}
                  style={styles.boutonLegende}>{leg}</button>
              ))}
            </div>
          )}
        </Section>

        <Section titre="💾 Exporter & Partager">
          <Btn onClick={telechargerMeme}>⬇ Télécharger PNG</Btn>
          <Btn onClick={ouvrirPartage} variante="partage">📤 Partager sur les réseaux</Btn>
          <Btn onClick={() => sauvegarderMeme(false)} disabled={etat.chargement} variante="save">🔒 Sauvegarder (privé)</Btn>
          <Btn onClick={() => sauvegarderMeme(true)}  disabled={etat.chargement} variante="pub">🌐 Publier dans la galerie</Btn>
        </Section>

        {etat.erreur && <div style={styles.erreur}>⚠️ {etat.erreur}</div>}
        {etat.succes && <div style={styles.succes}>{etat.succes}</div>}
      </div>

      {etat.afficherPartage && (
        <ModalPartage onFermer={() => dispatch({ type: 'SET_PARTAGE', valeur: false })} />
      )}
    </div>
  )
}

function ModalPartage({ onFermer }) {
  const urlPage = encodeURIComponent('https://memegen-ia.vercel.app')
  const texte   = encodeURIComponent("Regarde ce mème que j'ai créé avec MemeGen IA 🎭")
  const reseaux = [
    { nom: 'Twitter / X', couleur: '#000',    icone: '𝕏',  url: `https://twitter.com/intent/tweet?text=${texte}&url=${urlPage}` },
    { nom: 'Facebook',    couleur: '#1877f2', icone: 'f',  url: `https://www.facebook.com/sharer/sharer.php?u=${urlPage}` },
    { nom: 'WhatsApp',    couleur: '#25d366', icone: '💬', url: `https://api.whatsapp.com/send?text=${texte}%20${urlPage}` },
    { nom: 'Telegram',    couleur: '#0088cc', icone: '✈️', url: `https://t.me/share/url?url=${urlPage}&text=${texte}` },
    { nom: 'Reddit',      couleur: '#ff4500', icone: '👾', url: `https://reddit.com/submit?url=${urlPage}&title=${texte}` },
    { nom: 'LinkedIn',    couleur: '#0a66c2', icone: 'in', url: `https://www.linkedin.com/sharing/share-offsite/?url=${urlPage}` },
  ]
  return (
    <div style={styles.modalOverlay} onClick={onFermer}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalEntete}>
          <h3 style={styles.modalTitre}>📤 Partager sur les réseaux</h3>
          <button type="button" onClick={onFermer} style={styles.modalFermer}>✕</button>
        </div>
        <p style={styles.modalNote}>L'image a été téléchargée — uploade-la sur le réseau de ton choix.</p>
        <div style={styles.reseauxGrille}>
          {reseaux.map(({ nom, couleur, icone, url }) => (
            <a key={nom} href={url} target="_blank" rel="noopener noreferrer"
               style={{ ...styles.reseauBouton, background: couleur }}>
              <span style={styles.reseauIcone}>{icone}</span>
              <span style={styles.reseauNom}>{nom}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

function Section({ titre, children }) {
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <p style={styles.panneauTitre}>{titre}</p>
      {children}
    </div>
  )
}

function Btn({ children, onClick, disabled, variante }) {
  const variantesStyles = {
    danger:  { background: 'rgba(220,38,38,0.12)',  border: '1px solid rgba(220,38,38,0.25)',  color: '#fca5a5' },
    ia:      { background: 'linear-gradient(135deg,rgba(102,126,234,0.25),rgba(118,75,162,0.25))', border: '1px solid rgba(102,126,234,0.4)', color: '#c4b5fd', fontWeight: 700 },
    save:    { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' },
    pub:     { background: 'linear-gradient(135deg,rgba(102,126,234,0.35),rgba(118,75,162,0.35))', border: '1px solid rgba(102,126,234,0.5)', color: '#e0e7ff', fontWeight: 700 },
    partage: { background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)',  color: '#fde68a' },
  }
  return (
    <button type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      disabled={disabled}
      style={{ ...styles.bouton, ...(variantesStyles[variante] ?? {}) }}>
      {children}
    </button>
  )
}

const styles = {
  conteneur:    { display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' },
  zoneCanvas:   { flex: '1 1 500px' },
  canvasWrapper:{ borderRadius: 12, overflow: 'hidden', display: 'inline-block', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' },
  aide:         { marginTop: '0.6rem', fontSize: 12, color: '#6b7280', textAlign: 'center' },
  kbd:          { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: '1px 5px', fontSize: 11 },
  panneau:      { flex: '0 0 260px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1.25rem' },
  panneauTitre: { fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' },
  legendesHint: { fontSize: 11, color: '#6b7280', marginBottom: '0.4rem' },
  bouton:       { display: 'block', width: '100%', padding: '0.55rem 0.75rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#d1d5db', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: '0.35rem', textAlign: 'left' },
  boutonUpload: { display: 'block', width: '100%', padding: '0.6rem', background: 'rgba(102,126,234,0.15)', border: '1px solid rgba(102,126,234,0.35)', borderRadius: 8, color: '#a5b4fc', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center' },
  boutonLegende:{ display: 'block', width: '100%', padding: '0.5rem 0.75rem', marginBottom: '0.35rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#d1d5db', fontSize: 12, cursor: 'pointer', textAlign: 'left', lineHeight: 1.4 },
  erreur:       { background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8, padding: '0.7rem', color: '#fca5a5', fontSize: 13, marginTop: '0.5rem' },
  succes:       { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '0.7rem', color: '#6ee7b7', fontSize: 13, marginTop: '0.5rem' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:        { background: '#1e1e30', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '1.75rem', width: '100%', maxWidth: 420 },
  modalEntete:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
  modalTitre:   { fontSize: 18, fontWeight: 700, color: '#f0f0f0', margin: 0 },
  modalFermer:  { background: 'none', border: 'none', color: '#9ca3af', fontSize: 18, cursor: 'pointer' },
  modalNote:    { fontSize: 13, color: '#9ca3af', marginBottom: '1.25rem' },
  reseauxGrille:{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' },
  reseauBouton: { display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 1rem', borderRadius: 10, textDecoration: 'none', color: '#fff', fontWeight: 600, fontSize: 14 },
  reseauIcone:  { fontSize: 18, minWidth: 24, textAlign: 'center' },
  reseauNom:    { fontSize: 13 },
}