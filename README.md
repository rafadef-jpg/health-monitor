# Health Monitor

Aplicativo pessoal de monitoramento de saúde e treino, publicado como
**código-fonte disponível (source-available)**. Stack: Next.js 15 (App
Router) + TypeScript + TailwindCSS + shadcn/ui + PWA + Supabase (Auth,
PostgREST com RLS) + Anthropic (visão) + Web Push.

## Aviso importante

Este repositório é o aplicativo pessoal do autor, publicado para transparência
e estudo. **Não há suporte oficial, SLA ou infraestrutura pública.** Leia
`LICENSE` (PolyForm Noncommercial 1.0.0) antes de usar.

## Arquitetura

```txt
apps/web              App Next.js 15 (PWA). Único ponto de entrada.
packages/shared       Tipos e utilitários compartilhados.
packages/physiology   Lógica de fisiologia (scores, zonas, estresse).
supabase/             Schema versionado (schema_baseline.sql) + testes de RLS.
```

Decisões relevantes:

- **Persistência 100% via Supabase** (não há ORM local; o pacote Prisma
  foi removido como código morto).
- **Autenticação** por cookies `hm-access-token` / `hm-refresh-token`
  (HttpOnly) emitidos pelo Supabase Auth; middleware valida sessão e checa
  se o usuário conectou a Oura antes de liberar o dashboard.
- **Segredos de terceiros** (token Oura, service role, Anthropic, VAPID)
  nunca são expostos ao cliente; erros de SDK são logados no servidor e
  traduzidos para mensagens genéricas.
- **Compartilhamento público** via tokens opacos de 128 bits
  (`/view/[token]`), revogáveis, lidos com service role no servidor.

## Primeiros passos (local)

Pré-requisitos: Node 20+, npm workspaces, Docker (para o Supabase local) e
Supabase CLI.

```bash
npm install
npx supabase start            # sobe Postgres + Auth + REST locais
cp .env.example apps/web/.env.local
# edite apps/web/.env.local com as chaves locais exibidas por `npx supabase status`
npm run dev                   # http://localhost:3000
```

Variáveis de ambiente: ver `.env.example` (raiz, canônico). Nunca commite
`.env.local`.

## Verificação

```bash
npm run typecheck       # tipos (web + shared)
npm run lint            # eslint
npm run build           # build de produção
npm run test -w @health-monitor/web   # testes unitários node:test
```

Testes de RLS (Supabase local em pé):

```bash
node --test supabase/tests/
```

## Segurança

- Relatos de vulnerabilidade: ver `SECURITY.md` (nunca abra issue pública).
- Headers de segurança, rate-limit e validação de entrada em rotas sensíveis.
- Dependências monitoradas por GitHub Dependabot com pin via package-lock.

## Contribuindo

Ver `CONTRIBUTING.md`. PRs externos não são aceitos por ora; issues para
bugs não sensíveis são bem-vindas.

## Licença

PolyForm Noncommercial 1.0.0. Uso não-comercial (pessoal, educacional,
pesquisa, órgãos públicos) livre; qualquer uso comercial exige licença
separada. Texto completo em `LICENSE`.
