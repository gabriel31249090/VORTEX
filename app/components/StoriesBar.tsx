'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import StoryViewer, { type StoryGroup } from './StoryViewer'
import Image from 'next/image'

type StoryProfile = { id: string; username: string; avatar_url: string | null }
type Story = { id: string; user_id: string; media_url: string; media_type: 'image' | 'video'; created_at: string; profiles: StoryProfile }

export default function StoriesBar({ currentUserId }: { currentUserId: string }) {
  const [groups, setGroups] = useState<StoryGroup[]>([])
  const [myStories, setMyStories] = useState<Story[]>([])
  const [myProfile, setMyProfile] = useState<StoryProfile | null>(null)
  const [viewerGroup, setViewerGroup] = useState<StoryGroup | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function loadStories() {
    const { data } = await supabase
      .from('stories')
      .select('id, user_id, media_url, media_type, created_at, profiles(id, username, avatar_url)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })

    if (!data) return

    const byUser = new Map<string, StoryGroup>()
    const mine: Story[] = []

    ;(data as any[]).forEach((s) => {
      if (s.user_id === currentUserId) {
        mine.push(s)
        setMyProfile(s.profiles)
        return
      }
      const existing = byUser.get(s.user_id)
      if (existing) existing.stories.push(s)
      else byUser.set(s.user_id, { user: s.profiles, stories: [s] })
    })

    setGroups(Array.from(byUser.values()))
    setMyStories(mine)
  }

  useEffect(() => { loadStories() }, [currentUserId])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const mediaType = file.type.startsWith('video') ? 'video' : 'image'
    const ext = file.name.split('.').pop()
    const path = `${currentUserId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from('stories').upload(path, file)
    if (uploadError) {
      console.error(uploadError)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('stories').getPublicUrl(path)

    await supabase.from('stories').insert({
      user_id: currentUserId,
      media_url: urlData.publicUrl,
      media_type: mediaType,
    })

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    loadStories()
  }

  return (
    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '4px 4px 16px', marginBottom: 8 }}>
      {/* Seu story / botão de adicionar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div
          onClick={() => {
            if (myStories.length > 0 && myProfile) {
              setViewerGroup({ user: myProfile, stories: myStories })
            } else {
              fileInputRef.current?.click()
            }
          }}
          style={{
            width: 58, height: 58, borderRadius: '50%', position: 'relative', cursor: 'pointer',
            border: myStories.length > 0 ? '2px solid #c8f23c' : '2px dashed rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#111118', overflow: 'hidden',
          }}
        >
          {myStories.length > 0 ? (
            <Image src={myStories[myStories.length - 1].media_url} alt="" fill sizes="58px" style={{ objectFit: 'cover' }} />
          ) : uploading ? (
            <span style={{ fontSize: 11, color: '#c8f23c' }}>...</span>
          ) : (
            <span style={{ fontSize: 22, color: '#555577' }}>+</span>
          )}
          {myStories.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
              style={{
                position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%',
                background: '#c8f23c', color: '#000', border: '2px solid #0a0a0f', fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
              }}
            >
              +
            </button>
          )}
        </div>
        <span style={{ fontSize: 11, color: '#8888aa' }}>Você</span>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleUpload} style={{ display: 'none' }} />
      </div>

      {groups.map((g) => (
        <div key={g.user.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div
            onClick={() => setViewerGroup(g)}
            style={{ width: 58, height: 58, borderRadius: '50%', cursor: 'pointer', border: '2px solid #c8f23c', padding: 2 }}
          >
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#1a1a28', position: 'relative' }}>
              {g.user.avatar_url ? (
                <Image src={g.user.avatar_url} alt="" fill sizes="58px" style={{ objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8f23c', fontWeight: 800 }}>
                  {g.user.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <span style={{ fontSize: 11, color: '#8888aa', maxWidth: 58, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {g.user.username}
          </span>
        </div>
      ))}

      {viewerGroup && (
        <StoryViewer group={viewerGroup} onClose={() => { setViewerGroup(null); loadStories() }} />
      )}
    </div>
  )
}
