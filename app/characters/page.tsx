'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '../components/Nav'
import toast from 'react-hot-toast'

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

// ============ DADOS ESTÁTICOS ============
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
// custo cumulativo estilo D&D 5e simplificado
function pointCost(score: number) {
  if (score <= 13) return score - 8
  if (score === 14) return 7
  return 9 // 15
}

function mod(score: number) {
  const m = Math.floor((score - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

// ============ COMPONENTE ============
export default function CharactersPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [showWizard, setShowWizard] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // estado do wizard
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

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUserId(user.id)

    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Erro ao carregar personagens')
    } else {
      setCharacters(data as Character[])
    }
    setLoading(false)
  }

  function resetWizard() {
    setStep(1)
    setName('')
    setRace(RACES[0])
    setClassId(null)
    setAttrs({ for: 8, des: 8, con: 8, int: 8, sab: 8, car: 8 })
    setSkills([])
    setNotes('')
    setAvatarFile(null)
    setAvatarPreview(null)
    setEditingId(null)
  }

  function openCreate() {
    resetWizard()
    setShowWizard(true)
  }

  function openEdit(c: Character) {
    setEditingId(c.id)
    setStep(1)
    setName(c.name)
    setRace(c.race)
    setClassId(c.class)
    setAttrs({ for: c.for, des: c.des, con: c.con, int: c.int, sab: c.sab, car: c.car })
    setSkills(c.skills || [])
    setNotes(c.notes || '')
    setAvatarFile(null)
    setAvatarPreview(c.avatar_url)
    setShowWizard(true)
  }

  function adjustAttr(key: string, delta: number) {
    setAttrs(prev => {
      const current = prev[key]
      const next = current + delta
      if (next < ATTR_MIN || next > ATTR_MAX) return prev
      const nextSpent = ATTR_KEYS.reduce((sum, k) => sum + pointCost(k === key ? next : prev[k]), 0)
      if (nextSpent > POINT_BUY_TOTAL) return prev
      return { ...prev, [key]: next }
    })
  }

  function toggleSkill(s: string) {
    setSkills(prev => {
      if (prev.includes(s)) return prev.filter(x => x !== s)
      if (prev.length >= 4) {
        toast.error('Máximo de 4 perícias')
        return prev
      }
      return [...prev, s]
    })
  }

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter até 5MB')
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
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
        user_id: userId,
        name: name.trim(),
        race,
        class: classId,
        hp_max: hpMax,
        hp_current: hpMax,
        armor_class: armorClass,
        speed: 9,
        for: attrs.for,
        des: attrs.des,
        con: attrs.con,
        int: attrs.int,
        sab: attrs.sab,
        car: attrs.car,
        skills,
        notes,
        avatar_url: avatarUrl,
      }

      if (editingId) {
        const { error } = await supabase.from('characters').update(payload).eq('id', editingId)
        if (error) throw error
        toast.success('Personagem atualizado!')
      } else {
        const { error } = await supabase.from('characters').insert({ ...payload, level: 1, xp: 0, inventory: [] })
        if (error) throw error
        toast.success('Personagem criado!')
      }

      setShowWizard(false)
      resetWizard()
      load()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar personagem')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deletar esse personagem? Não dá pra desfazer.')) return
    const { error } = await supabase.from('characters').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao deletar')
    } else {
      toast.success('Personagem deletado')
      load()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0a12] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0a12] text-gray-200">
      <Nav />

      <main className="max-w-5xl mx-auto px-4 py-8 md:pl-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">🎭</span> Seus Personagens
            </h1>
            <p className="text-sm text-gray-500 mt-1">Fichas usadas no Abismo das Fichas</p>
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-medium hover:opacity-90 transition shadow-[0_0_20px_rgba(168,85,247,0.35)]"
          >
            + Criar Personagem
          </button>
        </div>

        {characters.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-purple-900/50 rounded-xl">
            <p className="text-gray-500">Você ainda não criou nenhum personagem.</p>
            <button onClick={openCreate} className="mt-4 text-purple-400 hover:text-purple-300 text-sm underline">
              Criar o primeiro
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map(c => {
              const cls = CLASSES.find(cl => cl.id === c.class)
              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-purple-900/40 bg-[#12101c] p-4 hover:border-purple-600/60 transition group relative"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-14 h-14 rounded-lg bg-[#1a1726] border border-purple-800/50 flex items-center justify-center text-2xl overflow-hidden flex-shrink-0">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        cls?.icon || '🎭'
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white truncate">{c.name}</h3>
                      <p className="text-xs text-gray-500">{c.race} · {cls?.name} · Nv.{c.level}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                    <div className="bg-[#1a1726] rounded py-1.5">
                      <div className="text-red-400 font-medium">{c.hp_current}/{c.hp_max}</div>
                      <div className="text-gray-600">HP</div>
                    </div>
                    <div className="bg-[#1a1726] rounded py-1.5">
                      <div className="text-cyan-400 font-medium">{c.armor_class}</div>
                      <div className="text-gray-600">CA</div>
                    </div>
                    <div className="bg-[#1a1726] rounded py-1.5">
                      <div className="text-amber-400 font-medium">{c.xp}</div>
                      <div className="text-gray-600">XP</div>
                    </div>
                  </div>

                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => openEdit(c)}
                      className="flex-1 text-xs py-1.5 rounded border border-purple-800/50 text-purple-300 hover:bg-purple-900/30"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="flex-1 text-xs py-1.5 rounded border border-red-900/50 text-red-400 hover:bg-red-900/30"
                    >
                      Deletar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ============ WIZARD MODAL ============ */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12101c] border border-purple-900/50 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* header com steps */}
            <div className="p-4 border-b border-purple-900/40 flex items-center justify-between sticky top-0 bg-[#12101c] z-10">
              <h2 className="font-semibold text-white">{editingId ? 'Editar Personagem' : 'Novo Personagem'}</h2>
              <button onClick={() => { setShowWizard(false); resetWizard() }} className="text-gray-500 hover:text-white">✕</button>
            </div>

            <div className="flex gap-1 px-4 pt-3">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-purple-500' : 'bg-purple-950'}`} />
              ))}
            </div>

            <div className="p-5">
              {/* STEP 1: nome + raça */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Nome do personagem</label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Ex: Kael, o Sombrio"
                      className="w-full bg-[#1a1726] border border-purple-900/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Raça</label>
                    <div className="grid grid-cols-2 gap-2">
                      {RACES.map(r => (
                        <button
                          key={r}
                          onClick={() => setRace(r)}
                          className={`text-sm py-2 rounded-lg border transition ${
                            race === r
                              ? 'border-purple-500 bg-purple-900/30 text-white'
                              : 'border-purple-900/40 text-gray-400 hover:border-purple-700'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Avatar (opcional)</label>
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-16 h-16 rounded-lg bg-[#1a1726] border border-purple-800/50 flex items-center justify-center cursor-pointer overflow-hidden"
                      >
                        {avatarPreview ? (
                          <img src={avatarPreview} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-600 text-xs">+</span>
                        )}
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
                      <span className="text-xs text-gray-500">Clique pra escolher uma imagem</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: classe */}
              {step === 2 && (
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Escolha a classe</label>
                  <div className="space-y-2">
                    {CLASSES.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setClassId(c.id)}
                        className={`w-full text-left p-3 rounded-lg border transition flex items-start gap-3 ${
                          classId === c.id
                            ? 'border-purple-500 bg-purple-900/30'
                            : 'border-purple-900/40 hover:border-purple-700'
                        }`}
                      >
                        <span className="text-2xl">{c.icon}</span>
                        <div>
                          <div className="text-sm font-medium text-white">{c.name}</div>
                          <div className="text-xs text-gray-500">{c.desc}</div>
                          <div className="text-xs text-purple-400 mt-1">HP base: {c.hp}{c.armorBonus ? ` · Armadura +${c.armorBonus}` : ''}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: atributos */}
              {step === 3 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs text-gray-400">Distribua os atributos</label>
                    <span className={`text-xs font-medium ${pointsLeft === 0 ? 'text-green-400' : 'text-amber-400'}`}>
                      {pointsLeft} pontos restantes
                    </span>
                  </div>
                  <div className="space-y-2">
                    {ATTR_KEYS.map(key => (
                      <div key={key} className="flex items-center justify-between bg-[#1a1726] rounded-lg px-3 py-2">
                        <span className="text-sm text-gray-300">{ATTR_LABELS[key]}</span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => adjustAttr(key, -1)}
                            className="w-6 h-6 rounded bg-purple-900/40 text-white hover:bg-purple-800/60 text-sm"
                          >
                            −
                          </button>
                          <span className="text-sm text-white w-14 text-center">
                            {attrs[key]} <span className="text-gray-500">({mod(attrs[key])})</span>
                          </span>
                          <button
                            onClick={() => adjustAttr(key, 1)}
                            className="w-6 h-6 rounded bg-purple-900/40 text-white hover:bg-purple-800/60 text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: perícias + notas */}
              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Perícias (até 4)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SKILLS.map(s => (
                        <button
                          key={s}
                          onClick={() => toggleSkill(s)}
                          className={`text-xs py-2 rounded-lg border transition ${
                            skills.includes(s)
                              ? 'border-purple-500 bg-purple-900/30 text-white'
                              : 'border-purple-900/40 text-gray-400 hover:border-purple-700'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Anotações (opcional)</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      placeholder="História, personalidade, objetivos..."
                      className="w-full bg-[#1a1726] border border-purple-900/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* footer navegação */}
            <div className="p-4 border-t border-purple-900/40 flex justify-between sticky bottom-0 bg-[#12101c]">
              <button
                onClick={() => (step === 1 ? setShowWizard(false) : setStep(step - 1))}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white"
              >
                {step === 1 ? 'Cancelar' : 'Voltar'}
              </button>

              {step < 4 ? (
                <button
                  onClick={() => {
                    if (step === 1 && !name.trim()) { toast.error('Dá um nome pro personagem!'); return }
                    if (step === 2 && !classId) { toast.error('Escolhe uma classe!'); return }
                    if (step === 3 && pointsLeft !== 0) { toast.error(`Ainda faltam ${pointsLeft} pontos`); return }
                    setStep(step + 1)
                  }}
                  className="px-5 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500"
                >
                  Próximo
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar personagem'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}