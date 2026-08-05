# Contribuição para VORTEX

Obrigado por contribuir com o VORTEX.

## Como contribuir

1. Faça um fork do repositório (se você não tiver acesso direto ao `main`).
2. Crie uma branch com nome descritivo:
   - `feature/descricao`
   - `fix/descricao`
   - `docs/descricao`
3. Faça commits pequenos e bem descritos.
4. Abra um Pull Request para `main`.
5. Inclua uma descrição clara do que foi alterado e por quê.

## Regras de revisão

- Use `npm run lint` antes de abrir o PR.
- Certifique-se de que o front-end constrói sem erros.
- Mudanças de layout e copy devem ser revisadas por pelo menos 1 outro contribuinte.
- Mudanças de segurança e autenticação devem ser revisadas por pelo menos 2 pessoas.

## Segurança do código

- Não inclua chaves secretas no código-fonte.
- Não comite arquivos de ambiente (`.env.local`, `.env`).
- Use variáveis de ambiente para credenciais e serviços externos.
- Valide todo acesso no servidor/Supabase e não dependa apenas do cliente.

## GitHub

- Branches devem ser mantidas atualizadas com `main`.
- Evite commits `--amend` ou `--force` em branches compartilhadas.
- Faça rebase apenas em branches locais antes de abrir o PR.
