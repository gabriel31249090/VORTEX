'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import StoryViewer, { type StoryGroup } from './StoryViewer'
import Image from 'next/image'
import { Plus } from 'lucide-react'

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

  const loadStories = useCallback(async () => {
    const { data } = await supabase
      .from('stories')
      .select('id, user_id, media_url, media_type, created_at, profiles(id, username, avatar_url)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })

    if (!data) return

    const byUser = new Map<string, StoryGroup>()
    const mine: Story[] = []
    let ownProfile: StoryProfile | null = null

    ;(data as unknown as Story[]).forEach((story) => {
      if (story.user_id === currentUserId) {
        mine.push(story)
        ownProfile = story.profiles
        return
      }
      const existing = byUser.get(story.user_id)
      if (existing) existing.stories.push(story)
      else byUser.set(story.user_id, { user: story.profiles, stories: [story] })
    })

    setGroups(Array.from(byUser.values()))
    setMyStories(mine)
    if (ownProfile) setMyProfile(ownProfile)
  }, [currentUserId, supabase])

  useEffect(() => { loadStories() }, [loadStories])

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

  const hasNetworkStories = groups.length > 0 || myStories.length > 0

  return (
    <>
      <div className={`vtx-stories-bar ${hasNetworkStories ? '' : 'is-empty'}`}>
        <button
          className="vtx-story-item vtx-story-item--mine"
          onClick={() => {
            if (myStories.length > 0 && myProfile) {
              setViewerGroup({ user: myProfile, stories: myStories })
            } else {
              fileInputRef.current?.click()
            }
          }}
        >
          <span className={`vtx-story-avatar ${myStories.length > 0 ? 'has-story' : ''}`}>
            {myStories.length > 0 ? (
              <Image
                src={myStories[myStories.length - 1].media_url}
                alt=""
                fill
                sizes="44px"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <Plus size={18} />
            )}
          </span>
          <span className="vtx-story-name">{uploading ? 'Enviando…' : myStories.length > 0 ? 'Seu story' : 'Criar story'}</span>
        </button>

        {groups.map((group) => (
          <button
            key={group.user.id}
            className="vtx-story-item"
            onClick={() => setViewerGroup(group)}
          >
            <span className="vtx-story-avatar has-story">
              <span className="vtx-story-avatar-inner">
                {group.user.avatar_url ? (
                  <Image src={group.user.avatar_url} alt="" fill sizes="44px" style={{ objectFit: 'cover' }} />
                ) : (
                  group.user.username?.charAt(0).toUpperCase()
                )}
              </span>
            </span>
            <span className="vtx-story-name">{group.user.username}</span>
          </button>
        ))}

        {groups.length === 0 && (
          <span className="vtx-stories-empty-copy">
            Stories de quem você acompanha aparecem aqui.
          </span>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
      </div>

      {viewerGroup && (
        <StoryViewer group={viewerGroup} onClose={() => { setViewerGroup(null); loadStories() }} />
      )}
    </>
  )
}
