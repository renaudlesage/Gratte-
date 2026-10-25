// Partitions poussées par le super admin (serveur). Élève : uniquement celles activées par son prof (RPC
// avec son jeton) ; prof et super admin : toutes (lecture directe, règles RLS).
import { useCallback, useEffect, useState } from 'react'
import { getClient, rpc } from './cloud.js'
import { useAccess } from './access.jsx'

export function useRemoteScores() {
  const { mode, student } = useAccess()
  const [list, setList] = useState([])
  const reload = useCallback(async () => {
    if (mode === 'eleve') return setList(student?.scores || [])
    if (mode === 'libre') return setList([])
    const sb = await getClient()
    const { data } = await sb.from('gratte_scores').select('id,title,folder,num,kind,tab,page_count').order('folder').order('num', { nullsFirst: false }).order('title')
    setList(data || [])
  }, [mode, student])
  useEffect(() => {
    reload()
  }, [reload])
  return { list, reload }
}

const cache = new Map()
export async function fetchPage(mode, token, scoreId, page) {
  const key = `${scoreId}:${page}`
  if (cache.has(key)) return cache.get(key)
  let row
  if (mode === 'eleve') row = await rpc('gratte_student_page', { p_token: token, p_score: scoreId, p_page: page })
  else {
    const sb = await getClient()
    const { data, error } = await sb.from('gratte_score_pages').select('mime,data').eq('score_id', scoreId).eq('page', page).maybeSingle()
    if (error) throw new Error(error.message)
    row = data
  }
  if (!row) throw new Error('Page indisponible.')
  const bin = atob(row.data)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const blob = new Blob([bytes], { type: row.mime })
  cache.set(key, blob)
  return blob
}

// Image → JPEG redimensionné (2000 px max) en base64, pour l'envoi
export async function imageToBase64(blob, max = 2000) {
  const bmp = await createImageBitmap(blob)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k)
  c.height = Math.round(bmp.height * k)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  const url = c.toDataURL('image/jpeg', 0.8)
  return url.slice(url.indexOf(',') + 1)
}
