// Recrutaê — Supabase Edge Function: process-search
// Deploy: supabase functions deploy process-search
//
// Env vars needed (set in Supabase dashboard → Settings → Edge Functions):
//   OPENAI_API_KEY      — para Whisper (transcrição de áudio)
//   ANTHROPIC_API_KEY   — para Claude (análise e job description)
//   RESEND_API_KEY      — para envio de email
//   RECRUITER_EMAIL     — email do recrutador que receberá os leads
//   RESEND_FROM_EMAIL   — remetente verificado no Resend (ex: noreply@recrutae.com.br)
//                         Use "onboarding@resend.dev" enquanto não tiver domínio verificado
//
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const body = await req.json();
    const contact = body.contact || {};

    const name = String(contact.name || "").trim();
    const email = String(contact.email || "").trim();
    const looksAutomated = /^[A-Za-z0-9]{10,}$/.test(name) && /[A-Z]/.test(name) && /[a-z]/.test(name);
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (name.length < 2 || name.length > 100 || looksAutomated || !validEmail) {
      return new Response(
        JSON.stringify({ success: false, error: "Dados de contato inválidos." }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Transcreve um áudio (base64) com Whisper. Retorna "" se não houver/falhar.
    // deno-lint-ignore no-explicit-any
    async function transcribe(audioBase64: any, audioMimeType: any): Promise<string> {
      if (!audioBase64) return "";
      try {
        const b64 = audioBase64.includes(",") ? audioBase64.split(",")[1] : audioBase64;
        const bin = atob(b64);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);

        const ext = (audioMimeType || "").includes("ogg") ? "ogg"
                  : (audioMimeType || "").includes("mp4") ? "mp4"
                  : "webm";

        const form = new FormData();
        form.append("file", new File([buf], `rec.${ext}`, { type: audioMimeType || "audio/webm" }));
        form.append("model", "whisper-1");
        form.append("language", "pt");

        const wr = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}` },
          body: form,
        });
        if (wr.ok) { const wd = await wr.json(); return wd.text || ""; }
        console.warn("Whisper error:", await wr.text());
      } catch (e) {
        console.warn("Whisper exception:", e);
      }
      return "";
    }

    // ── 1. Resolver respostas (cada pergunta = vídeo OU texto) ─────────────
    // Suporta o payload novo (body.answers por pergunta) e o antigo
    // (body.audioBase64 único + body.textAnswers).
    const QIDS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"];
    const resolved: Record<string, string> = {};
    const modes: Record<string, string> = {};

    if (body.answers && typeof body.answers === "object") {
      for (const qid of QIDS) {
        const a = body.answers[qid] || {};
        const isVideo = a.mode === "video" || !!a.audioBase64;
        modes[qid] = isVideo ? "video" : "text";
        resolved[qid] = isVideo
          ? await transcribe(a.audioBase64, a.audioMimeType)
          : (a.text || "").trim();
      }
    } else {
      const ta = body.textAnswers || {};
      resolved.q1 = await transcribe(body.audioBase64, body.audioMimeType);
      modes.q1 = body.audioBase64 ? "video" : "text";
      for (const qid of ["q2", "q3", "q4", "q5", "q6", "q7"]) {
        resolved[qid] = (ta[qid] || "").trim();
        modes[qid] = "text";
      }
    }

    // Transcrição principal (apresentação) — exibida no admin.
    const videoTranscripts = QIDS
      .filter((q) => modes[q] === "video" && resolved[q])
      .map((q) => `[${q}] ${resolved[q]}`);
    const transcript = resolved.q1
      || (videoTranscripts[0] || "(sem resposta em vídeo)");
    const textAnswers = resolved;

    // ── 2. Analisar com OpenAI GPT-4o ─────────────────────────────────────
    const systemPrompt = `Você é um especialista sênior em recrutamento executivo no Brasil com profundo conhecimento do mercado de trabalho brasileiro. Com base nas respostas de um gestor, crie uma job description completa e profissional, e faça uma análise real do mercado. Retorne APENAS um JSON válido sem markdown.`;

    const userPrompt = `=== RESPOSTAS DO GESTOR ===

[Apresentação e contexto]:
${textAnswers.q1 || "(não respondido)"}

[Título e área]:
${textAnswers.q2 || "(não respondido)"}

[Entregas dos primeiros 3 meses]:
${textAnswers.q3 || "(não respondido)"}

[Requisitos técnicos inegociáveis]:
${textAnswers.q4 || "(não respondido)"}

[Perfil comportamental e cultura]:
${textAnswers.q5 || "(não respondido)"}

[Modelo de trabalho]:
${textAnswers.q6 || "(não respondido)"}

[Contexto adicional]:
${textAnswers.q7 || "(não respondido)"}

=== RETORNE ESTE JSON EXATO ===
{
  "titulo_vaga": "string",
  "nivel_senioridade": "string (Júnior / Pleno / Sênior / Especialista / Coordenador / Gerente / Head / Diretor)",
  "empresa": "string (nome da empresa mencionada ou 'Empresa Confidencial')",
  "setor": "string",
  "contexto_empresa": "string (2 parágrafos sobre a empresa, momento de negócio e por que a vaga existe)",
  "sobre_a_vaga": "string (1 parágrafo introdutório da vaga)",
  "responsabilidades": ["string (6-8 responsabilidades concretas)"],
  "requisitos_obrigatorios": ["string (4-6 requisitos inegociáveis)"],
  "requisitos_desejaveis": ["string (3-4 diferenciais)"],
  "perfil_comportamental": ["string (4-5 características comportamentais)"],
  "modelo_trabalho": "string",
  "candidatos_mapeados": número inteiro entre 30 e 200 (baseado na sua análise real do mercado brasileiro para este perfil — considere senioridade, localização, especificidade técnica e escassez do perfil),
  "analise_mercado": "string (2-3 frases explicando a disponibilidade deste perfil no mercado brasileiro e por que esse número)",
  "resumo_executivo": "string (2 parágrafos completos para o recrutador: contexto da empresa, perfil buscado, urgência e fit cultural)"
}`;

    const cr = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    // deno-lint-ignore no-explicit-any
    let jd: Record<string, any> = {};
    if (cr.ok) {
      const cd = await cr.json();
      try {
        jd = JSON.parse(cd.choices?.[0]?.message?.content || "{}");
      } catch {
        jd = { titulo_vaga: textAnswers.q2 || "Posição em aberto" };
      }
    } else {
      console.warn("OpenAI error:", await cr.text());
      jd = { titulo_vaga: textAnswers.q2 || "Posição em aberto" };
    }

    // ── 3. Contagem real de candidatos (da análise da IA) ─────────────────
    const candidateCount = typeof jd.candidatos_mapeados === "number" && jd.candidatos_mapeados > 0
      ? jd.candidatos_mapeados
      : (() => {
          const sen = (jd.nivel_senioridade || "").toLowerCase();
          const isExec = /diretor|head|vp|c-level|ceo|cfo|coo|cto/.test(sen);
          return isExec ? 35 : 78;
        })();

    // ── 4. Salvar no Supabase ─────────────────────────────────────────────
    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: rec, error: dbErr } = await sb
      .from("candidate_searches")
      .insert({
        contact_name:    contact.name,
        contact_email:   contact.email,
        contact_phone:   contact.phone,
        contact_role:    contact.role,
        company_name:    contact.company,
        audio_transcript: transcript,
        text_answers:    textAnswers,
        job_description: jd,
        candidate_count: candidateCount,
        status:          "new",
      })
      .select("id")
      .single();

    if (dbErr) console.warn("DB insert error:", dbErr);

    // ── 5. Enviar email via Resend ─────────────────────────────────────────
    let emailStatus = "not_sent";
    const recruiterEmail = Deno.env.get("RECRUITER_EMAIL") || "";
    const fromEmail      = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    if (recruiterEmail && Deno.env.get("ENABLE_CANDIDATE_EMAILS") === "true") {
      const li = (arr: unknown) =>
        Array.isArray(arr)
          ? (arr as string[]).map(x => `<li style="margin-bottom:5px">${x}</li>`).join("")
          : "<li>—</li>";

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td>
<table width="620" align="center" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto">

  <!-- Header -->
  <tr><td style="background:#1F1C4B;padding:36px 44px;text-align:center">
    <p style="color:#F5B914;font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;margin:0 0 10px">🎯 Novo Lead Qualificado</p>
    <h1 style="color:#F5F0E8;font-size:26px;font-weight:800;margin:0;line-height:1.2">${jd.titulo_vaga || "Nova busca de candidatos"}</h1>
    <p style="color:rgba(245,240,232,.55);font-size:14px;margin:10px 0 0">${jd.empresa || contact.company} &middot; ${jd.setor || ""} &middot; ${new Date().toLocaleDateString("pt-BR")}</p>
  </td></tr>

  <!-- Stats bar -->
  <tr><td style="background:#F5B914;padding:18px 44px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="text-align:center;padding:0 8px">
          <p style="color:rgba(13,12,29,.5);font-size:10px;text-transform:uppercase;letter-spacing:.12em;margin:0 0 4px">Candidatos mapeados</p>
          <p style="color:#0D0C1D;font-size:38px;font-weight:800;margin:0;line-height:1">${candidateCount}</p>
        </td>
        <td style="text-align:center;padding:0 8px;border-left:1px solid rgba(13,12,29,.15)">
          <p style="color:rgba(13,12,29,.5);font-size:10px;text-transform:uppercase;letter-spacing:.12em;margin:0 0 4px">Senioridade</p>
          <p style="color:#0D0C1D;font-size:16px;font-weight:700;margin:0">${jd.nivel_senioridade || "—"}</p>
        </td>
        <td style="text-align:center;padding:0 8px;border-left:1px solid rgba(13,12,29,.15)">
          <p style="color:rgba(13,12,29,.5);font-size:10px;text-transform:uppercase;letter-spacing:.12em;margin:0 0 4px">Modelo</p>
          <p style="color:#0D0C1D;font-size:14px;font-weight:700;margin:0">${jd.modelo_trabalho || "—"}</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Contato -->
  <tr><td style="background:white;padding:28px 44px;border-bottom:2px solid #1F1C4B">
    <p style="color:#1F1C4B;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;margin:0 0 16px">Contato</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="33%" style="vertical-align:top;padding-bottom:12px">
          <p style="margin:0;font-size:10px;color:#6B6860;text-transform:uppercase;letter-spacing:.08em">Nome</p>
          <p style="margin:3px 0 0;font-size:15px;color:#0D0C1D;font-weight:700">${contact.name}</p>
        </td>
        <td width="33%" style="vertical-align:top;padding-bottom:12px">
          <p style="margin:0;font-size:10px;color:#6B6860;text-transform:uppercase;letter-spacing:.08em">Cargo</p>
          <p style="margin:3px 0 0;font-size:15px;color:#0D0C1D;font-weight:600">${contact.role}</p>
        </td>
        <td width="33%" style="vertical-align:top;padding-bottom:12px">
          <p style="margin:0;font-size:10px;color:#6B6860;text-transform:uppercase;letter-spacing:.08em">Empresa</p>
          <p style="margin:3px 0 0;font-size:15px;color:#0D0C1D;font-weight:600">${contact.company}</p>
        </td>
      </tr>
      <tr>
        <td style="vertical-align:top">
          <p style="margin:0;font-size:10px;color:#6B6860;text-transform:uppercase;letter-spacing:.08em">Email</p>
          <p style="margin:3px 0 0;font-size:14px"><a href="mailto:${contact.email}" style="color:#1F1C4B;font-weight:600">${contact.email}</a></p>
        </td>
        <td colspan="2" style="vertical-align:top">
          <p style="margin:0;font-size:10px;color:#6B6860;text-transform:uppercase;letter-spacing:.08em">WhatsApp</p>
          <p style="margin:3px 0 0;font-size:14px"><a href="https://wa.me/55${contact.phone.replace(/\D/g,"")}" style="color:#1F1C4B;font-weight:600">${contact.phone}</a></p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Resumo executivo -->
  <tr><td style="background:#1F1C4B;padding:28px 44px">
    <p style="color:#F5B914;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;margin:0 0 12px">Resumo executivo</p>
    <p style="font-size:14px;color:rgba(245,240,232,.85);line-height:1.75;margin:0">${jd.resumo_executivo || "—"}</p>
  </td></tr>

  <!-- Contexto empresa -->
  <tr><td style="background:white;padding:28px 44px;border-bottom:1px solid #EDE8DE">
    <p style="color:#1F1C4B;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;margin:0 0 12px">Contexto da empresa</p>
    <p style="font-size:14px;color:#444;line-height:1.75;margin:0">${jd.contexto_empresa || "—"}</p>
  </td></tr>

  <!-- Sobre a vaga -->
  <tr><td style="background:white;padding:28px 44px;border-bottom:1px solid #EDE8DE">
    <p style="color:#1F1C4B;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;margin:0 0 12px">Sobre a vaga</p>
    <p style="font-size:14px;color:#444;line-height:1.75;margin:0">${jd.sobre_a_vaga || "—"}</p>
  </td></tr>

  <!-- Responsabilidades -->
  <tr><td style="background:white;padding:28px 44px;border-bottom:1px solid #EDE8DE">
    <p style="color:#1F1C4B;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;margin:0 0 12px">Responsabilidades</p>
    <ul style="margin:0;padding-left:18px;font-size:13px;color:#333;line-height:1.8">${li(jd.responsabilidades)}</ul>
  </td></tr>

  <!-- Requisitos obrigatórios -->
  <tr><td style="background:#FEF3C7;padding:28px 44px;border-bottom:1px solid #EDE8DE;border-left:4px solid #F5B914">
    <p style="color:#1F1C4B;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;margin:0 0 12px">Requisitos obrigatórios</p>
    <ul style="margin:0;padding-left:18px;font-size:13px;color:#333;line-height:1.8">${li(jd.requisitos_obrigatorios)}</ul>
  </td></tr>

  <!-- Requisitos desejáveis -->
  <tr><td style="background:white;padding:28px 44px;border-bottom:1px solid #EDE8DE">
    <p style="color:#1F1C4B;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;margin:0 0 12px">Requisitos desejáveis</p>
    <ul style="margin:0;padding-left:18px;font-size:13px;color:#333;line-height:1.8">${li(jd.requisitos_desejaveis)}</ul>
  </td></tr>

  <!-- Perfil comportamental -->
  <tr><td style="background:white;padding:28px 44px;border-bottom:1px solid #EDE8DE">
    <p style="color:#1F1C4B;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;margin:0 0 12px">Perfil comportamental</p>
    <ul style="margin:0;padding-left:18px;font-size:13px;color:#333;line-height:1.8">${li(jd.perfil_comportamental)}</ul>
  </td></tr>

  <!-- Análise de mercado -->
  <tr><td style="background:#F5F0E8;padding:28px 44px;border-bottom:1px solid #EDE8DE">
    <p style="color:#1F1C4B;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;margin:0 0 10px">Análise de mercado</p>
    <p style="font-size:13px;color:#555;line-height:1.75;margin:0">${jd.analise_mercado || "—"}</p>
  </td></tr>

  <!-- Transcrição vídeo -->
  <tr><td style="background:#F5F0E8;padding:28px 44px;border-bottom:1px solid #EDE8DE">
    <p style="color:#1F1C4B;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;margin:0 0 10px">Transcrição do vídeo</p>
    <p style="font-size:13px;color:#777;font-style:italic;line-height:1.75;margin:0">"${transcript}"</p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#0D0C1D;padding:20px 44px;text-align:center">
    <p style="color:rgba(245,240,232,.25);font-size:11px;margin:0">Lead ID: ${rec?.id || "—"} &middot; Recrutaê &copy; ${new Date().getFullYear()}</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

      const er = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:    fromEmail,
          to:      [recruiterEmail],
          subject: `[Lead] ${contact.company} · ${jd.titulo_vaga || "Nova busca"} · ${contact.name}`,
          html,
        }),
      });

      if (!er.ok) {
        const resendError = await er.text();
        console.error(`Resend error (${er.status}):`, resendError);
        emailStatus = `failed: ${er.status} — ${resendError}`;
      } else {
        const resendOk = await er.json();
        emailStatus = `sent: ${resendOk.id}`;
        console.log("Email enviado:", resendOk.id);
      }
    }

    // ── 6. Responder ao frontend ───────────────────────────────────────────
    return new Response(
      JSON.stringify({ success: true, candidateCount, jobTitle: jd.titulo_vaga, emailStatus }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("process-search fatal:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
