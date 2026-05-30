import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import Anthropic from "@anthropic-ai/sdk";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";

const client = new Anthropic();

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);

  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("image") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Nenhuma imagem enviada." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mediaType = (file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif") || "image/jpeg";

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
    const msg = err instanceof Error ? err.message : "Erro ao analisar imagem.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const result = message.content[0].type === "text" ? message.content[0].text : "";
  return NextResponse.json({ medication: result });
}
