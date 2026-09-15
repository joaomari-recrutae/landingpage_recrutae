// Recrutaê — Supabase Edge Function: submit-contact
// Recebe os dados dos formulários, salva no banco (tabela contact_leads —
// visível no admin) e envia ao recrutador somente os leads comerciais.
//
// Deploy: supabase functions deploy submit-contact --no-verify-jwt
//
// Env vars (configuradas via deploy.js / dashboard):
//   RESEND_API_KEY      — envio de email
//   RECRUITER_EMAIL     — destinatário dos leads
//   RESEND_FROM_EMAIL   — remetente verificado no Resend
//   SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { assertContactWasSaved, shouldSendLeadEmail } from "./contact-routing.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body = await req.json();
    const name    = (body.name || "").toString().trim();
    const email   = (body.email || "").toString().trim();
    const phone   = (body.phone || "").toString().trim();
    const company = (body.company || "").toString().trim();
    const role    = (body.role || "").toString().trim();
    const country = (body.country || "").toString().trim();
    const types   = Array.isArray(body.types) ? body.types : [];
    const source  = (body.sourcePage || "").toString().trim();
    const contactKind = (body.contactKind || "").toString().trim();

    if (!name || !email) {
      return new Response(
        JSON.stringify({ success: false, error: "Nome e e-mail são obrigatórios." }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // ── 1. Salvar no Supabase ─────────────────────────────────────────────
    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: rec, error: dbErr } = await sb
      .from("contact_leads")
      .insert({
        name, email, phone, company, role,
        country,
        types,
        source_page: source,
        status: "new",
      })
      .select("id")
      .single();

    if (dbErr) console.error("DB insert error:", dbErr);
    assertContactWasSaved(dbErr);

    // ── 2. Enviar email via Resend ────────────────────────────────────────
    const sendLeadEmail = shouldSendLeadEmail({ contactKind, types, sourcePage: source });
    let emailStatus = sendLeadEmail ? "not_sent" : "suppressed_candidate";
    const recruiterEmail = Deno.env.get("RECRUITER_EMAIL") || "";
    const fromEmail      = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    if (recruiterEmail && sendLeadEmail) {
      const typeLabel = types.length
        ? types.map((t: string) => (t === "empresa" ? "Empresa" : t === "candidato" ? "Candidato" : t)).join(" · ")
        : "—";

      const row = (label: string, value: string, link?: string) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #EDE8DE;vertical-align:top;width:140px">
            <span style="font-size:11px;color:#6B6860;text-transform:uppercase;letter-spacing:.08em">${esc(label)}</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #EDE8DE;font-size:15px;color:#0D0C1D;font-weight:600">
            ${link ? `<a href="${link}" style="color:#1F1C4B;text-decoration:none">${esc(value)}</a>` : esc(value) || "—"}
          </td>
        </tr>`;

      const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td>
<table width="560" align="center" cellpadding="0" cellspacing="0" style="max-width:560px;margin:24px auto">
  <tr><td style="background:#1F1C4B;padding:30px 40px;text-align:center;border-radius:8px 8px 0 0">
    <p style="color:#F5B914;font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;margin:0 0 8px">✉ Novo contato pelo site</p>
    <h1 style="color:#F5F0E8;font-size:22px;font-weight:800;margin:0">${esc(name)}</h1>
    <p style="color:rgba(245,240,232,.55);font-size:13px;margin:8px 0 0">${esc(company) || "—"} · ${esc(typeLabel)} · ${new Date().toLocaleDateString("pt-BR")}</p>
  </td></tr>
  <tr><td style="background:#ffffff;padding:14px 40px 30px">
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Nome", name)}
      ${row("E-mail", email, `mailto:${esc(email)}`)}
      ${row("Telefone", phone, phone ? `https://wa.me/55${phone.replace(/\D/g, "")}` : undefined)}
      ${row("Empresa", company)}
      ${row("Cargo", role)}
      ${row("País", country)}
      ${row("Interesse", typeLabel)}
      ${row("Página", source)}
    </table>
  </td></tr>
  <tr><td style="background:#0D0C1D;padding:16px 40px;text-align:center;border-radius:0 0 8px 8px">
    <p style="color:rgba(245,240,232,.25);font-size:11px;margin:0">Lead ID: ${rec?.id || "—"} · Recrutaê © ${new Date().getFullYear()}</p>
  </td></tr>
</table></td></tr></table></body></html>`;

      const er = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recruiterEmail],
          reply_to: email,
          subject: `[Contato] ${name}${company ? " · " + company : ""}`,
          html,
        }),
      });

      if (!er.ok) {
        const t = await er.text();
        console.error(`Resend error (${er.status}):`, t);
        emailStatus = `failed: ${er.status}`;
      } else {
        const ok = await er.json();
        emailStatus = `sent: ${ok.id}`;
      }
    }

    return new Response(
      JSON.stringify({ success: true, id: rec?.id, emailStatus }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("submit-contact fatal:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
