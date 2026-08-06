type ModerationAction = 'approve' | 'review' | 'reject'

type ModerationResult = {
  action: ModerationAction
  reason: string
  labels?: Record<string, unknown>
  details?: Record<string, unknown>
}

const OBVIOUS_KEYWORDS: Record<string, string[]> = {
  odio: ['preto', 'branco', 'racista', 'racismo', 'homofobia', 'homofóbico', 'ódio', 'nazista', 'fascista', 'genocídio', 'xenofobia'],
  sexual: ['sexo', 'sexo anal', 'sexo oral', 'porn', 'pornografia', 'pedo', 'pedofilia', 'incesto', 'masturba', 'nudes', 'nudez', 'abuso sexual', 'estupr', 'molest'],
  violencia: ['matar', 'mata', 'assassino', 'assassinar', 'bombas', 'terrorismo', 'terrorista', 'explodir', 'tiroteio', 'estupro', 'abuso'],
  self_harm: ['suicídio', 'me matar', 'me mate', 'se matar', 'faca', 'cortar', 'enforcar'],
  hate: ['viado', 'puta', 'idiota', 'burro', 'nojento'],
}

const MINOR_SEXUAL_PATTERNS: RegExp[] = [
  /\b(crian[çc]a|crian[çc]as?|menino|menina|garoto|garota|adolescente)\b.*\b(sexo|porn|pornografia|pedofilia|incest|incesto|abuso sexual|abuso|estupr|molest|nudes|masturba|masturba[cç]o|genit[aá]lia)\b/,
  /\b(sexo|porn|pornografia|pedofilia|incest|incesto|abuso sexual|abuso|estupr|molest|nudes|masturba|masturba[cç]o|genit[aá]lia)\b.*\b(crian[çc]a|crian[çc]as?|menino|menina|garoto|garota|adolescente)\b/,
]

const SUSPICIOUS_KEYWORDS = [
  'droga', 'drogas', 'traficar', 'terror', 'radical', 'foda', 'morte', 'morrendo', 'apanhar', 'agredir', 'chantagem', 'ameaça',
  'xingamento', 'destruir', 'atacar', 'ataque', 'pedestre', 'crime', 'crime organizado', 'sequestrar'
]

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function keywordModeration(text: string): ModerationResult {
  const normalized = normalizeText(text)
  const foundObvious: string[] = []

  if (MINOR_SEXUAL_PATTERNS.some(pattern => pattern.test(normalized))) {
    return {
      action: 'reject',
      reason: 'Conteúdo sexual envolvendo menores detectado',
      labels: { categories: ['sexual/minors'] },
    }
  }

  Object.entries(OBVIOUS_KEYWORDS).forEach(([category, terms]) => {
    terms.forEach(term => {
      if (normalized.includes(term)) foundObvious.push(category)
    })
  })

  if (foundObvious.length > 0) {
    return {
      action: 'reject',
      reason: `Conteúdo claramente problemático (${[...new Set(foundObvious)].join(', ')})`,
      labels: { categories: [...new Set(foundObvious)] },
    }
  }

  const foundSuspicious = SUSPICIOUS_KEYWORDS.filter(term => normalized.includes(term))
  if (foundSuspicious.length > 0) {
    return {
      action: 'review',
      reason: `Conteúdo suspeito detectado (${[...new Set(foundSuspicious)].join(', ')})`,
      labels: { suspicious: [...new Set(foundSuspicious)] },
    }
  }

  return { action: 'approve', reason: 'Conteúdo limpo', labels: {} }
}

async function aiModeration(text: string): Promise<ModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return keywordModeration(text)

  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input: text, model: 'omni-moderation-latest' }),
    })

    if (!response.ok) return keywordModeration(text)

    const result = await response.json()
    const categories = result.results?.[0]?.categories || {}
    const categoryScores = result.results?.[0]?.category_scores || {}
    const flagged = result.results?.[0]?.flagged
    const labels: Record<string, unknown> = { categories, categoryScores }

    const dangerous = ['sexual', 'sexual/minors', 'hate', 'violence', 'self-harm', 'terrorism']
    const matched = Object.entries(categories)
      .filter(([, value]) => value === true)
      .map(([key]) => key)

    if (matched.length > 0) {
      const rejectLabels = matched.filter(label => dangerous.some(d => label.startsWith(d)))
      if (rejectLabels.length > 0) {
        return {
          action: 'reject',
          reason: `Conteúdo malsucedido na moderação automática (${rejectLabels.join(', ')})`,
          labels,
        }
      }

      return {
        action: 'review',
        reason: `Conteúdo precisa de revisão manual (${matched.join(', ')})`,
        labels,
      }
    }

    if (flagged) {
      return {
        action: 'review',
        reason: 'Conteúdo marcado como suspeito para revisão manual',
        labels,
      }
    }

    return { action: 'approve', reason: 'Conteúdo aprovado automaticamente', labels }
  } catch (error) {
    console.error('AI moderation failed', error)
    return keywordModeration(text)
  }
}

export async function moderateText(text: string, title?: string): Promise<ModerationResult> {
  const input = [title || '', text].filter(Boolean).join('\n\n')
  return aiModeration(input)
}
