import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return new NextResponse(html("Error", `<p style="color:#f87171">Auth error: ${error ?? "no code returned"}</p>`));
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${origin}/api/auth/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await res.json();

  if (!tokens.refresh_token) {
    return new NextResponse(
      html(
        "No Refresh Token",
        `<p style="color:#fbbf24">No refresh token returned. This usually means you already authorized this app before.</p>
         <p>Go to <a href="https://myaccount.google.com/permissions" style="color:#60a5fa">Google Account Permissions</a>, revoke access for this app, then <a href="/api/auth/google" style="color:#60a5fa">try again</a>.</p>`
      )
    );
  }

  return new NextResponse(
    html(
      "✓ Connected",
      `<h2 style="color:#34d399;margin-bottom:8px">✓ Google Calendar Connected!</h2>
       <p style="color:#94a3b8;margin-bottom:16px">Copy the refresh token below and add it to Vercel as an environment variable named <code style="background:#1e293b;padding:2px 6px;border-radius:4px">GOOGLE_REFRESH_TOKEN</code>.</p>
       <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;word-break:break-all;font-family:monospace;font-size:13px;margin-bottom:16px">
         ${tokens.refresh_token}
       </div>
       <p style="color:#94a3b8;font-size:13px;margin-bottom:8px"><strong>Steps:</strong></p>
       <ol style="color:#94a3b8;font-size:13px;line-height:1.8;padding-left:20px">
         <li>Go to your Vercel project → <strong>Settings → Environment Variables</strong></li>
         <li>Add variable: <code style="background:#1e293b;padding:2px 6px;border-radius:4px">GOOGLE_REFRESH_TOKEN</code> = the token above</li>
         <li>Click <strong>Save</strong>, then go to <strong>Deployments → Redeploy</strong></li>
         <li>Calendar meetings will appear automatically on the Workstreams page</li>
       </ol>
       <p style="color:#ef4444;font-size:12px;margin-top:16px">⚠ Treat this token like a password — do not share it.</p>`
    )
  );
}

function html(title: string, body: string) {
  return `<!DOCTYPE html><html><head><title>${title}</title></head>
  <body style="font-family:-apple-system,sans-serif;padding:48px;background:#0b1221;color:#e2e8f0;max-width:640px;margin:0 auto">
    ${body}
  </body></html>`;
}
