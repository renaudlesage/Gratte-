import { useEffect, useState } from 'react'
import { VOICES, strum } from '../lib/audio.js'
import { useSettings } from '../lib/settings.jsx'
import { useProgress } from '../lib/progress.jsx'
import { wakeLockSupported } from '../lib/useWakeLock.js'
import { useAccess } from '../lib/access.jsx'
import { JoinClass, LeaveClass } from './Account.jsx'
import { buildIcs, notificationsSupported, enableNotifications, disableNotifications, CUES, intentionText, kvSet } from '../lib/reminder.js'
import { useAddress } from '../lib/address.js'

function Segmented({ value, options, onChange, name }) {
  return (
    <div className="segmented" role="group" aria-label={name}>
      {options.map(([id, label]) => (
        <button key={String(id)} type="button" aria-pressed={value === id} className={value === id ? 'on' : ''} onClick={() => onChange(id)}>
          {label}
        </button>
      ))}
    </div>
  )
}

const isStandalone = () => {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  } catch {
    return false
  }
}
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

export default function Settings() {
  const s = useSettings()
  const { reset, sync } = useProgress()
  const [confirming, setConfirming] = useState(false)
  const [installEvt, setInstallEvt] = useState(() => window.__gratteInstall || null)

  useEffect(() => {
    const onReady = () => setInstallEvt(window.__gratteInstall || null)
    window.addEventListener('gratte-install-ready', onReady)
    return () => window.removeEventListener('gratte-install-ready', onReady)
  }, [])

  const install = async () => {
    if (!installEvt) return
    installEvt.prompt()
    await installEvt.userChoice.catch(() => null)
    window.__gratteInstall = null
    setInstallEvt(null)
  }

  return (
    <div className="settings">
      <ClassSection />
      <section className="setting">
        <div>
          <strong>Son de guitare</strong>
          <small>Utilisé pour les accords, rythmes, arpèges et chansons.</small>
        </div>
        <Segmented name="Son de guitare" value={s.voice} options={VOICES} onChange={(v) => { s.update({ voice: v }); strum([3, 2, 0, 0, 0, 3]) }} />
      </section>

      <section className="setting">
        <div>
          <strong>Garder l’écran allumé</strong>
          <small>
            {!wakeLockSupported()
              ? 'Non pris en charge par ce navigateur. Sur iPhone/iPad, mettez à jour vers iOS 16.4 ou plus récent ; sinon, allongez le délai de verrouillage dans les réglages de l’appareil.'
              : s.keepAwake
                ? s.awake
                  ? 'Actif : l’écran ne se verrouille pas tant que l’appli est affichée.'
                  : 'Activé : s’applique dès que vous touchez l’écran (le navigateur peut le refuser en mode économie d’énergie).'
                : 'Désactivé : l’appareil se verrouille selon ses propres réglages.'}
          </small>
        </div>
        <Segmented name="Garder l’écran allumé" value={s.keepAwake} options={[[true, 'Oui'], [false, 'Non']]} onChange={(v) => s.update({ keepAwake: v })} />
      </section>

      <section className="setting">
        <div>
          <strong>Thème</strong>
          <small>Sombre pour le soir, clair en plein jour, ou automatique selon l’appareil.</small>
        </div>
        <Segmented name="Thème" value={s.theme} options={[['sombre', 'Sombre'], ['clair', 'Clair'], ['auto', 'Auto']]} onChange={(v) => s.update({ theme: v })} />
      </section>

      <section className="setting">
        <div>
          <strong>Nom des notes</strong>
          <small>Notation anglaise (C, D, E) ou française (Do, Ré, Mi).</small>
        </div>
        <Segmented name="Notation" value={s.notation} options={[['en', 'C D E'], ['fr', 'Do Ré Mi']]} onChange={(v) => s.update({ notation: v })} />
      </section>

      <section className="setting">
        <div>
          <strong>Main</strong>
          <small>Les gauchers voient les schémas et le manche en miroir.</small>
        </div>
        <Segmented name="Main" value={s.lefty} options={[[false, 'Droitier'], [true, 'Gaucher']]} onChange={(v) => s.update({ lefty: v })} />
      </section>

      <section className="setting column">
        <div>
          <strong>Installer l’appli</strong>
          <small>Une icône sur l’écran d’accueil, en plein écran, utilisable sans connexion.</small>
        </div>
        {isStandalone() ? (
          <p className="good-text">✓ L’appli est installée.</p>
        ) : installEvt ? (
          <button className="btn btn-primary" onClick={install}>Installer sur cet appareil</button>
        ) : isIOS() ? (
          <p className="small">Sur iPhone/iPad : dans Safari, touchez <strong>Partager</strong> puis <strong>Sur l’écran d’accueil</strong>.</p>
        ) : (
          <p className="small muted">Dans Chrome ou Edge : menu ⋮ puis <strong>Installer l’application</strong> (ou « Ajouter à l’écran d’accueil »). Disponible une fois l’appli en ligne (Vercel).</p>
        )}
      </section>

      <ReminderSection reminder={s.reminder} update={s.update} />

      <SyncSection sync={sync} />

      <section className="setting column">
        <div>
          <strong>Progression</strong>
          <small>Leçons, records, activité et grilles personnelles.</small>
        </div>
        {confirming ? (
          <div className="reset-confirm left">
            <span>Effacer toute la progression sur cet appareil ?</span>
            <div className="row gap">
              <button className="btn small" onClick={() => setConfirming(false)}>Annuler</button>
              <button className="btn small btn-danger" onClick={() => { reset(); setConfirming(false) }}>Effacer</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-ghost small" onClick={() => setConfirming(true)}>Réinitialiser ma progression</button>
        )}
      </section>
    </div>
  )
}

const pad2 = (n) => String(n).padStart(2, '0')

function ReminderSection({ reminder, update }) {
  const t = useAddress()
  const { days } = useProgress()
  const [time, setTime] = useState(reminder ? `${pad2(reminder.hour)}:${pad2(reminder.minute)}` : '19:00')
  const [cue, setCue] = useState(reminder?.cue || null)
  const [msg, setMsg] = useState('')
  const [ics, setIcs] = useState(null)
  const parsed = (tm = time) => {
    const [h, m] = tm.split(':').map(Number)
    return { hour: h || 0, minute: m || 0 }
  }
  useEffect(() => () => ics && URL.revokeObjectURL(ics), [ics])

  // Intention de mise en œuvre : un moment précis de la journée → l'heure du rappel. Enregistré tout de suite.
  const pickCue = (c) => {
    const tm = c.hour === null ? time : `${pad2(c.hour)}:${pad2(c.minute)}`
    setCue(c.id)
    setTime(tm)
    setIcs(null)
    const r = { ...parsed(tm), cue: c.id, notify: reminder?.notify || false }
    update({ reminder: r })
    if (r.notify) kvSet('reminder', { ...r, enabled: true })
  }
  const changeTime = (v) => {
    setTime(v)
    setIcs(null)
    if (cue) {
      const r = { ...parsed(v), cue, notify: reminder?.notify || false }
      update({ reminder: r })
      if (r.notify) kvSet('reminder', { ...r, enabled: true })
    }
  }

  const makeIcs = () => {
    const r = { ...parsed(), cue }
    update({ reminder: { ...r, notify: reminder?.notify || false } })
    const blob = new Blob([buildIcs(r, window.location.origin + '/')], { type: 'text/calendar' })
    setIcs(URL.createObjectURL(blob))
  }

  const toggleNotify = async () => {
    const r = { ...parsed(), cue }
    if (reminder?.notify) {
      await disableNotifications()
      update({ reminder: { ...r, notify: false } })
      setMsg('Notifications de rappel désactivées.')
      return
    }
    const res = await enableNotifications(r)
    update({ reminder: { ...r, notify: res.ok } })
    setMsg(res.msg)
  }

  const plan = intentionText({ ...parsed(), cue })
  // Suivi simple : combien de jours de pratique sur les 7 derniers
  const week = (() => {
    const d = new Date()
    const keys = new Set()
    for (let i = 0; i < 7; i++) {
      keys.add(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`)
      d.setDate(d.getDate() - 1)
    }
    return days.filter((x) => keys.has(x)).length
  })()

  return (
    <section className="setting column">
      <div>
        <strong>Rappel quotidien</strong>
        <small>{t('Choisissez un moment qui revient chaque jour : la décision est prise d’avance, il n’y a plus qu’à suivre le plan.', 'Choisis un moment qui revient chaque jour : la décision est prise d’avance, il n’y a plus qu’à suivre le plan.')}</small>
      </div>
      <div className="intention">
        <div role="group" aria-labelledby="intent-q">
          <p className="srl-q" id="intent-q"><strong>Quand…</strong> <span className="muted small">je prends ma guitare</span></p>
          <div className="srl-row">
            {CUES.map((c) => (
              <button key={c.id} type="button" className="srl-opt" aria-pressed={cue === c.id} onClick={() => pickCue(c)}>
                {c.when}
                {c.hour !== null && <small>{pad2(c.hour)}:{pad2(c.minute)}</small>}
              </button>
            ))}
          </div>
        </div>
        {plan && (
          <p className="intention-text" aria-live="polite">
            <strong>{t('Votre plan', 'Ton plan')} : « {plan} »</strong>
            <br />
            <span className="small muted">Plan B : si le temps manque, je fais juste le défi minute (2 min). L’habitude compte plus que la durée.</span>
          </p>
        )}
        {plan && <p className="small muted">{`Ces 7 derniers jours : ${week} jour${week > 1 ? 's' : ''} de pratique.`}{week < 3 ? t(' Si le moment choisi ne tient pas, essayez-en un autre.', ' Si le moment choisi ne tient pas, essaie-en un autre.') : ''}</p>}
      </div>
      <label className="field-inline">
        {cue && cue !== 'autre' ? 'Heure du rappel' : 'Heure'}
        <input id="reminder-time" className="input small-input" type="time" value={time} onChange={(e) => changeTime(e.target.value)} />
      </label>
      <div className="row gap wrap">
        {ics ? (
          <a className="btn btn-primary small" href={ics} download="gratte-rappel.ics">Télécharger le rappel d’agenda</a>
        ) : (
          <button className="btn btn-primary small" onClick={makeIcs}>Ajouter à mon agenda</button>
        )}
        {notificationsSupported() && (
          <button className="btn small" onClick={toggleNotify}>{reminder?.notify ? 'Désactiver les notifications' : 'Notifications sur cet appareil'}</button>
        )}
      </div>
      <p className="muted small">
        {ics
          ? 'Ouvrez le fichier téléchargé : votre agenda propose d’ajouter un événement quotidien avec alarme, intitulé avec votre plan.'
          : 'Le rappel d’agenda fonctionne sur tous les téléphones. Les notifications de l’appli dépendent du navigateur (Chrome/Android, appli installée).'}
      </p>
      {msg && <p className="small" role="status">{msg}</p>}
    </section>
  )
}

function SyncSection({ sync }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  if (!sync.configured) {
    return (
      <section className="setting column">
        <div>
          <strong>Synchronisation entre appareils</strong>
          <small>Désactivée : la progression reste sur cet appareil. Pour l’activer, renseignez les variables Supabase du projet (voir le README).</small>
        </div>
      </section>
    )
  }

  const run = async (fn, ok) => {
    setBusy(true)
    setMsg('')
    try {
      await fn()
      if (ok) setMsg(ok)
    } catch (e) {
      setMsg(e?.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="setting column">
      <div>
        <strong>Compte (prof, super admin, synchronisation)</strong>
        <small>Connexion par e-mail : retrouvez votre progression sur tous vos appareils. Les profs enregistrés accèdent ensuite à l’Espace prof (🎓).</small>
      </div>
      {sync.user ? (
        <>
          <p className="small">
            Connecté : <strong>{sync.user.email}</strong>
            <br />
            {sync.status === 'syncing' && 'Synchronisation…'}
            {sync.status === 'ok' && sync.lastSync && `✓ Synchronisé à ${sync.lastSync.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}`}
            {sync.status === 'error' && <span className="error" role="alert">Échec : {sync.error}</span>}
          </p>
          <div className="row gap wrap">
            <button className="btn small" onClick={sync.syncNow} disabled={sync.status === 'syncing'}>Synchroniser maintenant</button>
            <button className="btn btn-ghost small" onClick={sync.signOut}>Se déconnecter</button>
          </div>
        </>
      ) : (
        <>
          <label className="field">
            <span>Adresse e-mail</span>
            <input id="sync-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.be" />
          </label>
          <button className="btn btn-primary" disabled={busy || !/.+@.+\..+/.test(email)} onClick={() => run(async () => { await sync.sendLink(email.trim()); setSent(true) }, 'E-mail envoyé : ouvrez le lien sur cet appareil, ou saisissez le code reçu.')}>
            Recevoir le lien de connexion
          </button>
          {sent && (
            <div className="row gap">
              <label className="field">
                <span>Code reçu (si présent dans l’e-mail)</span>
                <input id="sync-code" className="input" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} />
              </label>
              <button className="btn" disabled={busy || code.length < 6} onClick={() => run(() => sync.verifyCode(email.trim(), code), '')}>Valider</button>
            </div>
          )}
          {msg && <p className="small">{msg}</p>}
        </>
      )}
    </section>
  )
}

// Élève : rejoindre une classe ou la quitter (code de sortie du prof)
function ClassSection() {
  const { mode, student, role } = useAccess()
  if (mode === 'eleve') {
    return (
      <section className="setting column" id="classe">
        <div>
          <strong>Ma classe : {student.classe}</strong>
          <small>Connecté(e) comme {student.prenom}. Tu vois les leçons et les morceaux que ton prof a activés.</small>
        </div>
        <LeaveClass />
      </section>
    )
  }
  if (role) return null
  return (
    <section className="setting column" id="classe">
      <div>
        <strong>Je suis élève</strong>
        <small>Ton prof t’a donné un code de classe ? Tu ne verras alors que ce qu’il a activé pour toi.</small>
      </div>
      <JoinClass />
    </section>
  )
}
