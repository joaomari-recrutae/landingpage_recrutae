// Recrutaê — Supabase Edge Function: instagram-feed
// Retorna os posts mais recentes do Instagram (@recrut.ae) usando a API oficial
// (Instagram API with Instagram Login). Renova o token automaticamente antes
// de expirar, então funciona indefinidamente sem intervenção manual.
//
// Deploy: supabase functions deploy instagram-feed --no-verify-jwt
//
// Requer que a tabela `instagram_settings` já tenha uma linha com o token
// de longa duração (ver setup-instagram.js / README).
//
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=1800, s-maxage=1800", // 30 min
};

const esc = (s: unknown) => String(s ?? "").trim();

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 3, 12);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: settings, error: settingsErr } = await sb
      .from("instagram_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (settingsErr || !settings?.access_token || !settings?.ig_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "not_configured", posts: [] }),
        { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    let accessToken = settings.access_token as string;
    const igUserId = settings.ig_user_id as string;

    // ── Renova o token se estiver perto de expirar (< 5 dias) ─────────────
    const expiresAt = settings.expires_at ? new Date(settings.expires_at) : null;
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
    const needsRefresh = !expiresAt || (expiresAt.getTime() - Date.now()) < fiveDaysMs;

    if (needsRefresh) {
      try {
        const refreshRes = await fetch(
          `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(accessToken)}`
        );
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.access_token) {
            accessToken = refreshData.access_token;
            const newExpiresAt = new Date(Date.now() + (refreshData.expires_in ?? 5184000) * 1000).toISOString();
            await sb
              .from("instagram_settings")
              .update({ access_token: accessToken, expires_at: newExpiresAt, updated_at: new Date().toISOString() })
              .eq("id", 1);
          }
        } else {
          console.warn("Instagram token refresh failed:", await refreshRes.text());
        }
      } catch (e) {
        console.warn("Instagram token refresh error:", e);
      }
    }

    // ── Busca os posts mais recentes (endpoint oficial: /<IG_ID>/media) ────
    const fields = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";
    const mediaRes = await fetch(
      `https://graph.instagram.com/${igUserId}/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(accessToken)}`
    );

    if (!mediaRes.ok) {
      const errText = await mediaRes.text();
      console.error("Instagram media fetch failed:", errText);
      return new Response(
        JSON.stringify({ success: false, error: "fetch_failed", posts: [] }),
        { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const mediaJson = await mediaRes.json();
    const items = Array.isArray(mediaJson.data) ? mediaJson.data : [];

    const posts = items
      .filter((p: any) => p.media_type !== "VIDEO" || p.thumbnail_url) // precisa de imagem exibivel
      .slice(0, limit)
      .map((p: any) => ({
        id: p.id,
        image: p.media_type === "VIDEO" ? p.thumbnail_url : p.media_url,
        permalink: p.permalink,
        caption: esc(p.caption).slice(0, 200),
        timestamp: p.timestamp,
      }));

    return new Response(
      JSON.stringify({ success: true, posts }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("instagram-feed error:", e);
    return new Response(
      JSON.stringify({ success: false, error: "internal_error", posts: [] }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
