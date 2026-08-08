"use client";

import { useState } from "react";
import { denunciar } from "@/app/actions/moderation";

const MOTIVOS = [
  { value: "spam", label: "Spam" },
  { value: "assedio", label: "Assédio ou bullying" },
  { value: "discurso_de_odio", label: "Discurso de ódio" },
  { value: "nudez_conteudo_sexual", label: "Nudez ou conteúdo sexual" },
  { value: "exploracao_infantil", label: "Exploração infantil" },
  { value: "violencia", label: "Violência ou ameaça" },
  { value: "outro", label: "Outro motivo" },
] as const;

export function ReportButton({
  targetType,
  targetId,
  label = "Denunciar",
}: {
  targetType: "post" | "user" | "message";
  targetId: string;
  label?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState<string>("");
  const [detalhes, setDetalhes] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function fechar() {
    setAberto(false);
    // reseta o estado depois da animação de fechar
    setTimeout(() => {
      setMotivo("");
      setDetalhes("");
      setEnviado(false);
      setErro(null);
    }, 200);
  }

  async function enviar() {
    if (!motivo) return;
    setEnviando(true);
    setErro(null);

    const resultado = await denunciar({
      targetType,
      targetId,
      reason: motivo as (typeof MOTIVOS)[number]["value"],
      details: detalhes || undefined,
    });

    setEnviando(false);

    if ("error" in resultado) {
      setErro(resultado.error);
      return;
    }

    setEnviado(true);
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="text-sm text-neutral-500 transition-colors hover:text-red-400"
      >
        {label}
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={fechar}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-neutral-800 bg-neutral-950 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {enviado ? (
              <>
                <p className="font-syne text-lg font-semibold text-white">
                  Denúncia enviada
                </p>
                <p className="mt-2 text-sm text-neutral-400">
                  Obrigado por avisar. Nossa equipe vai analisar em breve.
                </p>
                <button
                  onClick={fechar}
                  className="mt-6 w-full rounded-md bg-[#c8f23c] py-2 text-sm font-medium text-black"
                >
                  Fechar
                </button>
              </>
            ) : (
              <>
                <p className="font-syne text-lg font-semibold text-white">
                  Por que você está denunciando isso?
                </p>

                <div className="mt-4 space-y-2">
                  {MOTIVOS.map((m) => (
                    <label
                      key={m.value}
                      className="flex items-center gap-2 text-sm text-neutral-300"
                    >
                      <input
                        type="radio"
                        name="motivo"
                        value={m.value}
                        checked={motivo === m.value}
                        onChange={() => setMotivo(m.value)}
                        className="accent-[#c8f23c]"
                      />
                      {m.label}
                    </label>
                  ))}
                </div>

                <textarea
                  value={detalhes}
                  onChange={(e) => setDetalhes(e.target.value)}
                  placeholder="Detalhes (opcional)"
                  rows={3}
                  className="mt-4 w-full resize-none rounded-md border border-neutral-800 bg-black p-2 text-sm text-neutral-200 outline-none focus:border-[#c8f23c]"
                />

                {erro && <p className="mt-2 text-sm text-red-400">{erro}</p>}

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={fechar}
                    className="flex-1 rounded-md border border-neutral-800 py-2 text-sm text-neutral-400 transition-colors hover:text-neutral-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={enviar}
                    disabled={!motivo || enviando}
                    className="flex-1 rounded-md bg-[#c8f23c] py-2 text-sm font-medium text-black disabled:opacity-50"
                  >
                    {enviando ? "Enviando..." : "Enviar denúncia"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
