import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_ACCESS_COOKIE } from "@/lib/auth/cookies";
import { getUserFromAccessToken } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const supabase = createSupabaseServerClient(accessToken);
  const { data } = await supabase
    .from("share_tokens")
    .select("id, token, label, active, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ tokens: data ?? [] });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { label } = await request.json().catch(() => ({}));
  const supabase = createSupabaseServerClient(accessToken);
  const { data, error } = await supabase
    .from("share_tokens")
    .insert({ user_id: user.id, label: label ?? "Personal" })
    .select("token")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ token: data.token });
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const user = await getUserFromAccessToken(accessToken);
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id } = await request.json().catch(() => ({}));
  const supabase = createSupabaseServerClient(accessToken);
  await supabase.from("share_tokens").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
