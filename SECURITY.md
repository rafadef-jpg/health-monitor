# Política de Segurança

## Escopo

Este repositório cobre um aplicativo pessoal de monitoramento de saúde
(Next.js 15 + Supabase + Anthropic + Web Push). São considerados em
escopo relatos envolvendo:

- Quebra de isolamento entre usuários (RLS, middleware de sessão, páginas
  públicas de compartilhamento em `/view/[token]`).
- Vazamento de segredos ou chaves (Anthropic, Supabase service role, VAPID,
  CRON_SECRET) por respostas de API, logs ou código comitado.
- Endpoints de cron e de IA sem autorização adequada.
- Injeção via uploads de imagem, assinaturas de push ou parâmetros de API.

Fora de escopo: vulnerabilidades exclusivas de dependências de terceiros sem
caminho de exploração demonstrável neste projeto, e problemas de
infraestrutura que não pertencem ao código deste repositório.

## Versões suportadas

Somente o branch `main` recebe correções de segurança.

## Como reportar

**Não abra issue pública.** Requisitos de contato:

- Envie relatórios por e-mail para o mantenedor. Abra uma solicitação de
  contato privada via GitHub (Security Advisories do repositório) e o canal
  de e-mail será compartilhado dentro do advisory privado.
- Inclua: passos de reprodução, impacto esperado, e (se aplicável) prova de
  conceito mínima.

## Prazos e divulgação (GCP-084)

- Reconhecimento do relato: até 72 horas.
- Avaliação de severidade e plano de correção: até 7 dias.
- Divulgação coordenada: após correção em `main` e aceite mútuo de data.
  Não há prazo máximo imposto ao pesquisador; pede-se boa-fé para não
  publicar antes do patch.

## Notas

- Nenhuma chave de API, e-mail pessoal ou URL de produção está comitada
  neste repositório. Se encontrar algo assim, trate como incidente de
  segurança e reporte pelo canal acima.
- Este projeto é distribuído como código-fonte disponível (PolyForm
  Noncommercial 1.0.0), sem garantia de qualquer espécie (ver `LICENSE`).
