import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { validateImageUpload } from "@/lib/upload/image-validation";
import { rateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/api/error-handler";

const client = new Anthropic();

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const rl = rateLimit(`ai:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em instantes." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  try {
    const form = await req.formData();
    const image = form.get("image") as File | null;

    const validation = await validateImageUpload(image);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const base64 = validation.bytes.toString("base64");
    const mediaType = validation.mediaType;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Analise esta foto de treino ou ficha de exercicios e retorne JSON com os exercicios identificados.

Formato (apenas JSON puro, sem texto adicional):
[
  {"name": "Nome do exercicio", "sets": 3, "reps": 10, "weight_kg": 80, "notes": ""},
  ...
]

Regras:
- Se nao encontrar exercicios, retorne []
- sets e reps sao inteiros (0 se nao identificado)
- weight_kg e decimal (0 se nao identificado)
- name em portugues
- Apenas o array JSON`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return NextResponse.json({ exercises: [] });

    const exercises = JSON.parse(match[0]);
    return NextResponse.json({ exercises });
  } catch (err) {
    logServerError("identify-workout", err);
    return NextResponse.json({ error: "Erro ao processar imagem." }, { status: 500 });
  }
}
