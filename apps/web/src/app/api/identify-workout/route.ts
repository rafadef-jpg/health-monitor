import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const image = form.get("image") as File | null;
    if (!image) return NextResponse.json({ error: "Imagem nao enviada." }, { status: 400 });

    const buffer = await image.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mediaType = (image.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp";

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
    console.error("identify-workout error:", err);
    return NextResponse.json({ error: "Erro ao processar imagem." }, { status: 500 });
  }
}
