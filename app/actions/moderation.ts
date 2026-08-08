"use server";

// Ajuste este import pro caminho real do seu client Supabase de servidor.
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type TipoAlvo = "post" | "user" | "message";

type MotivoDenuncia =
  | "spam"
  | "assedio"
  | "discurso_de_odio"
  | "nudez_conteudo_sexual"
  | "exploracao_infantil"
  | "violencia"
  | "outro";

type ResultadoAcao = { success: true } | { error: string };

export async function denunciar(params: {
  targetType: TipoAlvo;
  targetId: string;
  reason: MotivoDenuncia;
  details?: string;
}): Promise<ResultadoAcao> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Você precisa estar logado pra denunciar." };

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: params.targetType,
    target_id: params.targetId,
    reason: params.reason,
    details: params.details ?? null,
  });

  if (error) {
    console.error("Erro ao registrar denúncia:", error);
    return { error: "Não foi possível enviar a denúncia. Tenta de novo." };
  }

  return { success: true };
}

export async function bloquearUsuario(blockedId: string): Promise<ResultadoAcao> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Você precisa estar logado." };
  if (user.id === blockedId) return { error: "Você não pode bloquear a si mesmo." };

  const { error } = await supabase.from("blocks").insert({
    blocker_id: user.id,
    blocked_id: blockedId,
  });

  if (error) {
    console.error("Erro ao bloquear usuário:", error);
    return { error: "Não foi possível bloquear esse usuário." };
  }

  revalidatePath("/feed");
  return { success: true };
}

export async function desbloquearUsuario(blockedId: string): Promise<ResultadoAcao> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Você precisa estar logado." };

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", blockedId);

  if (error) {
    console.error("Erro ao desbloquear usuário:", error);
    return { error: "Não foi possível desbloquear esse usuário." };
  }

  revalidatePath("/feed");
  return { success: true };
}

// Use no server (ex: layout de perfil ou de conversa) pra decidir se
// mostra o perfil normalmente ou bloqueia o acesso.
export async function estaBloqueado(outroUsuarioId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase.rpc("existe_bloqueio", {
    usuario_a: user.id,
    usuario_b: outroUsuarioId,
  });

  return Boolean(data);
}

// Use ao montar a query do feed, busca ou lista de conversas pra excluir
// qualquer post/usuário envolvido em um bloqueio (nas duas direções).
export async function idsBloqueadosParaMim(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ids_bloqueados_para_mim");

  if (error) {
    console.error("Erro ao buscar bloqueios:", error);
    return [];
  }

  return (data ?? []).map((linha: unknown) =>
    typeof linha === "string" ? linha : (linha as { ids_bloqueados_para_mim: string }).ids_bloqueados_para_mim
  );
}
