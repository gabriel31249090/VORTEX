"use client";

import { useState } from "react";
import { bloquearUsuario, desbloquearUsuario } from "@/app/actions/moderation";

export function BlockButton({
  userId,
  blockedInitially = false,
}: {
  userId: string;
  blockedInitially?: boolean;
}) {
  const [bloqueado, setBloqueado] = useState(blockedInitially);
  const [carregando, setCarregando] = useState(false);

  async function alternar() {
    setCarregando(true);
    const resultado = bloqueado
      ? await desbloquearUsuario(userId)
      : await bloquearUsuario(userId);
    setCarregando(false);
    if (!("error" in resultado)) setBloqueado(!bloqueado);
  }

  return (
    <button
      onClick={alternar}
      disabled={carregando}
      className={
        bloqueado
          ? "rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition-colors hover:border-neutral-500"
          : "rounded-md border border-red-900 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-950/30"
      }
    >
      {carregando ? "..." : bloqueado ? "Desbloquear" : "Bloquear usuário"}
    </button>
  );
}
