# VORTEX — Política de Privacidade, Termos de Uso e Moderação

## O que tem aqui

```
app/privacidade/page.tsx        → página /privacidade
app/termos/page.tsx             → página /termos
app/actions/moderation.ts       → server actions: denunciar, bloquear, desbloquear
components/moderation/ReportButton.tsx
components/moderation/BlockButton.tsx
supabase/migrations/20260808_reports_and_blocks.sql
```

## Antes de rodar

1. **Rode a migração** no Supabase (SQL Editor ou `supabase db push`, dependendo
   de como você já aplica migrações no projeto).
2. **Ajuste o import** em `app/actions/moderation.ts`:
   ```ts
   import { createClient } from "@/lib/supabase/server";
   ```
   Troque pro caminho real do seu client Supabase de servidor, se for diferente.
3. **Preencha os `TODO`** no topo de `privacidade/page.tsx` e `termos/page.tsx`
   (e-mails de contato e seu nome completo como responsável pelos dados).

## Como usar os componentes

```tsx
import { ReportButton } from "@/components/moderation/ReportButton";
import { BlockButton } from "@/components/moderation/BlockButton";

// Num post
<ReportButton targetType="post" targetId={post.id} />

// Num perfil
<ReportButton targetType="user" targetId={profile.id} />
<BlockButton userId={profile.id} blockedInitially={jaEstaBloqueado} />
```

## Falta ligar: filtrar o feed e as DMs pelos bloqueios

As tabelas e a função `ids_bloqueados_para_mim()` já existem, mas a ligação
com as suas queries de feed/conversas é específica do seu schema — ajuste os
nomes de tabela/coluna abaixo pro que você já tem:

```ts
import { idsBloqueadosParaMim } from "@/app/actions/moderation";

const bloqueados = await idsBloqueadosParaMim();

let query = supabase
  .from("posts") // ajuste o nome da sua tabela de posts
  .select("*")
  .order("created_at", { ascending: false });

if (bloqueados.length > 0) {
  query = query.not("user_id", "in", `(${bloqueados.join(",")})`);
}

const { data: posts } = await query;
```

Faça o mesmo na lista de conversas do seu sistema de DM (filtrando por
`conversation_participants`) e, se quiser reforçar no banco em vez de só na
aplicação, dá pra usar `existe_bloqueio()` dentro de uma policy de RLS da
tabela de mensagens — mas isso exige acesso ao schema exato das suas tabelas
de DM, que eu não tenho aqui.

## Por que isso importa pro Play Store

Reporte e bloqueio dentro do app são exigência do Google Play pra qualquer
app com conteúdo gerado por usuário (UGC), sem exceção — é um dos itens mais
checados na revisão. Depois de integrar isso, os dois itens que ainda ficam
pendentes da lista original são o Child Safety Standards (página pública +
contato responsável) e o formulário de Segurança de Dados dentro do próprio
Play Console.
