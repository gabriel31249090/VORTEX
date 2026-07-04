'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '../../components/Nav'
import toast from 'react-hot-toast'
import { createRun, type RunPlayerStats } from '@/lib/abismo/runSync'

// ============ TIPOS ============
type ClassId = 'gambler' | 'trickster' | 'knight' | 'necromancer' | 'dealer'

type CharacterClass = {
  id: ClassId
  name: string
  icon: string
  desc: string
  hp: number
  armorBonus: number
}

type Character = {
  id: string
  user_id: string
  name: string
  race: string
  class: ClassId
  level: number
  xp: number
  hp_max: number
  hp_current: number
  armor_class: number
  speed: number
  for: number
  des: number
  con: number
  int: number
  sab: number
  car: number
  skills: string[]
  inventory: string[]
  notes: string
  avatar_url: string | null
  created_at: string
}

const CLASSES: CharacterClass[] = [
  { id: 'gambler', name: 'Apostador', icon: '🎰', desc: 'Mestre das fichas. Ganha mais ouro e dobra apostas.', hp: 28, armorBonus: 0 },
  { id: 'trickster', name: 'Trapaceiro', icon: '🃏', desc: 'Habilidoso nas trocas. Duas trocas de carta por turno.', hp: 25, armorBonus: 0 },
  { id: 'knight', name: 'Cavaleiro', icon: '⚔️', desc: 'Guerreiro amaldiçoado. Inicia batalhas com armadura.', hp: 35, armorBonus: 4 },
  { id: 'necromancer', name: 'Necromante', icon: '💀', desc: 'Drena vida dos inimigos com suas jogadas.', hp: 22, armorBonus: 0 },
  { id: 'dealer', name: 'Dealer Infernal', icon: '🔥', desc: 'Domina cartas amaldiçoadas para causar dano extra.', hp: 26, armorBonus: 0 },
]

const RACES = ['Humano', 'Elfo', 'Anão', 'Halfling', 'Meio-Órc', 'Tiefling', 'Amaldiçoado']
const SKILLS = ['Furtividade', 'Persuasão', 'Percepção', 'Sobrevivência', 'Arcanismo', 'Atletismo', 'Intimidação', 'Ladinagem']
const ATTR_KEYS = ['for', 'des', 'con', 'int', 'sab', 'car'] as const
const ATTR_LABELS: Record<(typeof ATTR_KEYS)[number], string> = {
  for: 'Força', des: 'Destreza', con: 'Constituição', int: 'Inteligência', sab: 'Sabedoria', car: 'Carisma',
}

const POINT_BUY_TOTAL = 27
const ATTR_MIN = 8
const ATTR_MAX = 15

function pointCost(score: number) {
  if (score <= 13) return score - 8
  if (score === 14) return 7
  return 9
}

function mod(score: number) {
  const m = Math.floor((score - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

export default function AbismoGamePage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [showWizard, setShowWizard] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [startingRunId, setStartingRunId] = useState<string | null>(null)

  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [race, setRace] = useState(RACES[0])
  const [classId, setClassId] = useState<ClassId | null>(null)
  const [attrs, setAttrs] = useState<Record<string, number>>({ for: 8, des: 8, con: 8, int: 8, sab: 8, car: 8 })
  const [skills, setSkills] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const pointsSpent = ATTR_KEYS.reduce((sum, k) => sum + pointCost(attrs[k]), 0)
  const pointsLeft = POINT_BUY_TOTAL - pointsSpent

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) toast.error('Erro ao carregar personagens')
    else setCharacters(data as Character[])
    setLoading(false)
  }

  function resetWizard() {
    setStep(1); setName(''); setRace(RACES[0]); setClassId(null)
    setAttrs({ for: 8, des: 8, con: 8, int: 8, sab: 8, car: 8 })
    setSkills([]); setNotes(''); setAvatarFile(null); setAvatarPreview(null); setEditingId(null)
  }

  function openCreate() { resetWizard(); setShowWizard(true) }

  function openEdit(c: Character) {
    setEditingId(c.id); setStep(1); setName(c.name); setRace(c.race); setClassId(c.class)
    setAttrs({ for: c.for, des: c.des, con: c.con, int: c.int, sab: c.sab, car: c.car })
    setSkills(c.skills || []); setNotes(c.notes || ''); setAvatarFile(null); setAvatarPreview(c.avatar_url); setShowWizard(true)
  }

  function adjustAttr(key: string, delta: number) {
    setAttrs(prev => {
      const current = prev[key]; const next = current + delta
      if (next < ATTR_MIN || next > ATTR_MAX) return prev
      const nextSpent = ATTR_KEYS.reduce((sum, k) => sum + pointCost(k === key ? next : prev[k]), 0)
      if (nextSpent > POINT_BUY_TOTAL) return prev
      return { ...prev, [key]: next }
    })
  }

  function toggleSkill(s: string) {
    setSkills(prev => {
      if (prev.includes(s)) return prev.filter(x => x !== s)
      if (prev.length >= 4) { toast.error('Máximo de 4 perícias'); return prev }
      return [...prev, s]
    })
  }

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem deve ter até 5MB'); return }
    setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!userId) return
    if (!name.trim()) { toast.error('Dá um nome pro personagem!'); return }
    if (!classId) { toast.error('Escolhe uma classe!'); return }
    if (pointsLeft !== 0) { toast.error(`Ainda faltam distribuir ${pointsLeft} pontos de atributo`); return }
    setSaving(true)
    try {
      let avatarUrl = editingId ? avatarPreview : null
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${userId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('characters')
          .upload(path, avatarFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('characters').getPublicUrl(path)
        avatarUrl = urlData.publicUrl
      }
      const cls = CLASSES.find(c => c.id === classId)!
      const hpMax = cls.hp + Math.floor((attrs.con - 10) / 2) * 2
      const armorClass = 10 + Math.floor((attrs.des - 10) / 2) + cls.armorBonus
      const payload = {
        user_id: userId, name: name.trim(), race, class: classId,
        hp_max: hpMax, hp_current: hpMax, armor_class: armorClass, speed: 9,
        for: attrs.for, des: attrs.des, con: attrs.con, int: attrs.int, sab: attrs.sab, car: attrs.car,
        skills, notes, avatar_url: avatarUrl,
      }
      if (editingId) {
        const { error } = await supabase.from('characters').update(payload).eq('id', editingId)
        if (error) throw error
        toast.success('Personagem atualizado!')
      } else {
        const { error } = await supabase.from('characters').insert({
          ...payload, level: 1, xp: 0, inventory: [],
        })
        if (error) throw error
        toast.success('Personagem criado!')
      }
      setShowWizard(false); resetWizard(); load()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar personagem')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deletar esse personagem? Não dá pra desfazer.')) return
    const { error } = await supabase.from('characters').delete().eq('id', id)
    if (error) toast.error('Erro ao deletar')
    else { toast.success('Personagem deletado'); load() }
  }

  async function handlePlay(c: Character) {
    if (!userId) return
    setStartingRunId(c.id)
    try {
      const stats: RunPlayerStats = {
        characterId: c.id,
        characterName: c.name,
        classId: c.class,
        avatarUrl: c.avatar_url,
        hp: c.hp_current,
        maxHp: c.hp_max,
        gold: 0,
        relics: [],
        inventory: [],
      }
      const run = await createRun(userId, stats)
      router.push(`/games/abismo/play/${run.id}`)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar a run')
    } finally {
      setStartingRunId(null)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #c8f23c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d12', color: '#f0f0f8', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px', paddingLeft: 'calc(220px + 24px)' }}
        className="abismo-main">
        <Link href="/games" style={{ fontSize: 13, color: '#8888aa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}
          onMouseEnter={e => e.currentTarget.style.color = '#c8f23c'}
          onMouseLeave={e => e.currentTarget.style.color = '#8888aa'}>
          ← Voltar pra Jogos
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 32 }}>🎰</span>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f0f0f8' }}>Abismo das Fichas</h1>
            <p style={{ fontSize: 14, color: '#8888aa' }}>Roguelike de cartas multiplayer</p>
          </div>
        </div>

        <div style={{
          marginTop: 24, marginBottom: 32, borderRadius: 12,
          border: '1px dashed rgba(200,242,60,0.15)', padding: 24, textAlign: 'center'
        }}>
          <p style={{ fontSize: 14, color: '#8888aa' }}>O jogo em si ainda vai entrar aqui (multiplayer via Supabase Realtime).</p>
          <p style={{ fontSize: 12, color: '#666688', marginTop: 4 }}>Por enquanto, crie e gerencie seus personagens abaixo.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#c8f23c' }}>🎭</span> Seus Personagens
          </h2>
          <button
            onClick={openCreate}
            style={{
              padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: '#c8f23c', color: '#000', fontWeight: 700, fontSize: 13,
              fontFamily: "'Syne', sans-serif", boxShadow: '0 0 16px rgba(200,242,60,0.3)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 24px rgba(200,242,60,0.5)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 16px rgba(200,242,60,0.3)'}
          >
            + Criar Personagem
          </button>
        </div>

        {characters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed rgba(200,242,60,0.1)', borderRadius: 12 }}>
            <p style={{ color: '#8888aa' }}>Você ainda não criou nenhum personagem.</p>
            <button onClick={openCreate} style={{ marginTop: 12, color: '#c8f23c', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>
              Criar o primeiro
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {characters.map(c => {
              const cls = CLASSES.find(cl => cl.id === c.class)
              return (
                <div
                  key={c.id}
                  style={{
                    borderRadius: 12, border: '1px solid rgba(200,242,60,0.1)',
                    background: '#111118', padding: 16,
                    transition: 'all 0.2s', position: 'relative',
                  }}
                  className="char-card"
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.3)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(200,242,60,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 10, background: '#1a1726',
                      border: '1px solid rgba(200,242,60,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, overflow: 'hidden', flexShrink: 0
                    }}>
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (cls?.icon || '🎭')}
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 700, color: '#f0f0f8', fontSize: 15 }}>{c.name}</h3>
                      <p style={{ fontSize: 12, color: '#8888aa' }}>{c.race} · {cls?.name} · Nv.{c.level}</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center', fontSize: 12, marginBottom: 12 }}>
                    <div style={{ background: '#1a1726', borderRadius: 8, padding: '8px 4px' }}>
                      <div style={{ color: '#ff4466', fontWeight: 700 }}>{c.hp_current}/{c.hp_max}</div>
                      <div style={{ color: '#666688', fontSize: 10 }}>HP</div>
                    </div>
                    <div style={{ background: '#1a1726', borderRadius: 8, padding: '8px 4px' }}>
                      <div style={{ color: '#60a5fa', fontWeight: 700 }}>{c.armor_class}</div>
                      <div style={{ color: '#666688', fontSize: 10 }}>CA</div>
                    </div>
                    <div style={{ background: '#1a1726', borderRadius: 8, padding: '8px 4px' }}>
                      <div style={{ color: '#c8f23c', fontWeight: 700 }}>{c.xp}</div>
                      <div style={{ color: '#666688', fontSize: 10 }}>XP</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      onClick={() => handlePlay(c)}
                      disabled={startingRunId === c.id}
                      style={{
                        width: '100%', padding: '8px 0', borderRadius: 8, border: 'none',
                        background: startingRunId === c.id ? '#555' : '#c8f23c',
                        color: '#000', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                        fontFamily: "'Syne', sans-serif", opacity: startingRunId === c.id ? 0.6 : 1,
                        boxShadow: startingRunId === c.id ? 'none' : '0 0 12px rgba(200,242,60,0.3)',
                      }}
                    >
                      {startingRunId === c.id ? 'Entrando no abismo...' : '▶ Jogar'}
                    </button>
                    <div className="char-actions" style={{ display: 'flex', gap: 8, opacity: 0, transition: 'opacity 0.2s' }}>
                      <button
                        onClick={() => openEdit(c)}
                        style={{
                          flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid rgba(200,242,60,0.2)',
                          background: 'transparent', color: '#c8f23c', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        }}
                      >Editar</button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        style={{
                          flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid rgba(255,68,102,0.2)',
                          background: 'transparent', color: '#ff4466', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        }}
                      >Deletar</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* WIZARD MODAL */}
      {showWizard && (
        <>
          <div onClick={() => { setShowWizard(false); resetWizard() }} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 200,
          }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: '#111118', border: '1px solid rgba(200,242,60,0.2)', borderRadius: 16,
            width: '90%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', zIndex: 201,
            fontFamily: "'Syne', sans-serif",
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(200,242,60,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#111118', zIndex: 10 }}>
              <h2 style={{ color: '#f0f0f8', fontSize: 16, fontWeight: 700 }}>{editingId ? 'Editar Personagem' : 'Novo Personagem'}</h2>
              <button onClick={() => { setShowWizard(false); resetWizard() }} style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 4, padding: '12px 20px 0' }}>
              {[1, 2, 3, 4].map(s => (
                <div key={s} style={{ height: 3, flex: 1, borderRadius: 2, background: s <= step ? '#c8f23c' : '#333355' }} />
              ))}
            </div>

            <div style={{ padding: 20 }}>
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label htmlFor="char-name" style={{ fontSize: 12, color: '#8888aa', marginBottom: 6, display: 'block' }}>
                      Nome do personagem
                    </label>
                    <input
                      id="char-name"
                      name="char-name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Ex: Kael, o Sombrio"
                      style={{
                        width: '100%', background: '#1a1726', border: '1px solid rgba(200,242,60,0.15)', borderRadius: 8,
                        padding: '10px 12px', color: '#f0f0f8', fontSize: 14, outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: '#8888aa', marginBottom: 6, display: 'block' }}>Raça</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {RACES.map(r => (
                        <button key={r} onClick={() => setRace(r)}
                          style={{
                            padding: '10px', borderRadius: 8, border: race === r ? '1px solid #c8f23c' : '1px solid rgba(200,242,60,0.1)',
                            background: race === r ? 'rgba(200,242,60,0.1)' : 'transparent',
                            color: race === r ? '#f0f0f8' : '#8888aa', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                          }}>{r}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="avatar-upload" style={{ fontSize: 12, color: '#8888aa', marginBottom: 6, display: 'block' }}>
                      Avatar (opcional)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <label
                        htmlFor="avatar-upload"
                        style={{
                          width: 64, height: 64, borderRadius: 10, background: '#1a1726',
                          border: '1px solid rgba(200,242,60,0.2)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                        }}
                      >
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Avatar preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ color: '#666688', fontSize: 12 }}>+</span>
                        )}
                      </label>
                      <input
                        id="avatar-upload"
                        name="avatar"
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleAvatarSelect}
                      />
                      <span style={{ fontSize: 12, color: '#8888aa' }}>Clique pra escolher</span>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <span style={{ fontSize: 12, color: '#8888aa', marginBottom: 8, display: 'block' }}>Escolha a classe</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {CLASSES.map(c => (
                      <button key={c.id} onClick={() => setClassId(c.id)}
                        style={{
                          textAlign: 'left', padding: 12, borderRadius: 10,
                          border: classId === c.id ? '1px solid #c8f23c' : '1px solid rgba(200,242,60,0.1)',
                          background: classId === c.id ? 'rgba(200,242,60,0.08)' : 'transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12,
                        }}>
                        <span style={{ fontSize: 28 }}>{c.icon}</span>
                        <div>
                          <div style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                          <div style={{ color: '#8888aa', fontSize: 12, marginTop: 2 }}>{c.desc}</div>
                          <div style={{ color: '#c8f23c', fontSize: 11, marginTop: 4 }}>HP base: {c.hp}{c.armorBonus ? ` · Armadura +${c.armorBonus}` : ''}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: '#8888aa' }}>Distribua os atributos</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: pointsLeft === 0 ? '#c8f23c' : '#ffaa00' }}>{pointsLeft} pontos restantes</span>
                  </div>
                  {ATTR_KEYS.map(key => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1a1726', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
                      <span style={{ color: '#f0f0f8', fontSize: 14 }}>{ATTR_LABELS[key]}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={() => adjustAttr(key, -1)} style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(200,242,60,0.1)', border: 'none', color: '#c8f23c', cursor: 'pointer', fontSize: 16 }}>−</button>
                        <span style={{ color: '#f0f0f8', fontSize: 14, width: 50, textAlign: 'center' }}>{attrs[key]} <span style={{ color: '#8888aa' }}>({mod(attrs[key])})</span></span>
                        <button onClick={() => adjustAttr(key, 1)} style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(200,242,60,0.1)', border: 'none', color: '#c8f23c', cursor: 'pointer', fontSize: 16 }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {step === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <span style={{ fontSize: 12, color: '#8888aa', marginBottom: 8, display: 'block' }}>Perícias (até 4)</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {SKILLS.map(s => (
                        <button key={s} onClick={() => toggleSkill(s)}
                          style={{
                            padding: '10px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                            border: skills.includes(s) ? '1px solid #c8f23c' : '1px solid rgba(200,242,60,0.1)',
                            background: skills.includes(s) ? 'rgba(200,242,60,0.1)' : 'transparent',
                            color: skills.includes(s) ? '#f0f0f8' : '#8888aa',
                          }}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="char-notes" style={{ fontSize: 12, color: '#8888aa', marginBottom: 6, display: 'block' }}>
                      Anotações (opcional)
                    </label>
                    <textarea
                      id="char-notes"
                      name="char-notes"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      placeholder="História, personalidade, objetivos..."
                      style={{
                        width: '100%', background: '#1a1726', border: '1px solid rgba(200,242,60,0.15)', borderRadius: 8,
                        padding: '10px 12px', color: '#f0f0f8', fontSize: 13, outline: 'none', resize: 'none',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(200,242,60,0.1)', display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => step === 1 ? (setShowWizard(false), resetWizard()) : setStep(step - 1)}
                style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {step === 1 ? 'Cancelar' : 'Voltar'}
              </button>
              {step < 4 ? (
                <button onClick={() => {
                  if (step === 1 && !name.trim()) { toast.error('Dá um nome pro personagem!'); return }
                  if (step === 2 && !classId) { toast.error('Escolhe uma classe!'); return }
                  if (step === 3 && pointsLeft !== 0) { toast.error(`Ainda faltam ${pointsLeft} pontos`); return }
                  setStep(step + 1)
                }}
                  style={{
                    padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: '#c8f23c', color: '#000', fontWeight: 700, fontSize: 13,
                    fontFamily: "'Syne', sans-serif",
                  }}>Próximo</button>
              ) : (
                <button onClick={handleSave} disabled={saving}
                  style={{
                    padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: saving ? '#555' : '#c8f23c', color: '#000', fontWeight: 700, fontSize: 13,
                    fontFamily: "'Syne', sans-serif", opacity: saving ? 0.6 : 1,
                  }}>{saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar personagem'}</button>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        .char-card:hover .char-actions { opacity: 1 !important; }
        @media (max-width: 767px) {
          .abismo-main { padding-left: 16px !important; padding-bottom: 80px; }
        }
      `}</style>
    </div>
  )
}