import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import Anthropic from "@anthropic-ai/sdk";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { validateImageUpload } from "@/lib/upload/image-validation";
import { rateLimit } from "@/lib/rate-limit";
import { logServerError, serverErrorResponse } from "@/lib/api/error-handler";

const client = new Anthropic();

export async function POST(request: Request) {
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

  const formData = await request.formData();
  const file = formData.get("image") as File | null;

  const validation = await validateImageUpload(file);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const base64 = validation.bytes.toString("base64");
  const mediaType = validation.mediaType;

  let message;
  try {
    message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: `Você identifica medicamentos a partir de fotos de caixas, cartelas ou bulas.
Responda apenas com o nome do medicamento, dosagem e horário se visível.
Formato: "NomeMedicamento DosagemMG" ou "NomeMedicamento DosagemMG tomado às HH:MM".
Se não conseguir identificar, responda: "Não consegui identificar o medicamento."
Seja direto — sem explicações, sem frases extras.`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: "Qual é esse medicamento?" },
          ],
        },
      ],
    });
  } catch (err) {
    logServerError("identify-medication", err);
    return serverErrorResponse("Erro ao analisar imagem. Tente novamente.", 502);
  }

  const result = message.content[0].type === "text" ? message.content[0].text : "";
  return NextResponse.json({ medication: result });
}
