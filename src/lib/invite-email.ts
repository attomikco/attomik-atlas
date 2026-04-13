// Inline-styled HTML for brand team invites. Matches the Attomik aesthetic:
// white background, Barlow heading, DM Mono body, black pill button with
// neon-green text. No external CSS, no media queries — same constraints as
// the other transactional emails in this codebase.

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
}

export function buildInviteEmailHtml({
  brandName,
  inviterName,
  role,
  acceptUrl,
}: {
  brandName: string
  inviterName: string
  role: string
  acceptUrl: string
}): string {
  const roleLabel = ROLE_LABELS[role] || 'Member'
  const hf = "'Barlow',Helvetica,Arial,sans-serif"
  const bf = "'DM Mono','Courier New',Courier,monospace"

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(brandName)} invited you to Attomik</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f2f2f2;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2f2f2;padding:48px 16px;">
<tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border-radius:16px;box-shadow:0 2px 16px rgba(0,0,0,0.05);">
    <tr><td style="padding:48px 40px 16px;text-align:center;">
      <div style="font-family:${hf};font-size:13px;font-weight:700;color:#555555;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:24px;">Attomik</div>
      <h1 style="margin:0;font-family:${hf};font-size:32px;font-weight:900;color:#000000;line-height:1.1;text-transform:uppercase;letter-spacing:-0.02em;">You're invited to<br>${escapeHtml(brandName)}</h1>
    </td></tr>
    <tr><td style="padding:24px 40px 8px;text-align:center;">
      <p style="margin:0;font-family:${bf};font-size:15px;font-weight:400;color:#555555;line-height:1.6;">
        <strong style="color:#000000;">${escapeHtml(inviterName)}</strong> has invited you to collaborate on <strong style="color:#000000;">${escapeHtml(brandName)}</strong> on Attomik as a <strong style="color:#000000;">${escapeHtml(roleLabel)}</strong>.
      </p>
    </td></tr>
    <tr><td style="padding:32px 40px 16px;text-align:center;">
      <table cellpadding="0" cellspacing="0" border="0" align="center">
      <tr><td style="background:#000000;border-radius:999px;">
        <a href="${escapeAttr(acceptUrl)}" style="display:inline-block;padding:16px 44px;font-family:${hf};font-size:15px;font-weight:800;color:#00ff97;text-decoration:none;text-transform:uppercase;letter-spacing:0.06em;">Accept Invite &rarr;</a>
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:12px 40px 8px;text-align:center;">
      <p style="margin:0;font-family:${bf};font-size:11px;font-weight:400;color:#999999;line-height:1.6;">
        Or paste this link in your browser:<br>
        <a href="${escapeAttr(acceptUrl)}" style="color:#555555;word-break:break-all;">${escapeHtml(acceptUrl)}</a>
      </p>
    </td></tr>
    <tr><td style="padding:24px 40px 48px;text-align:center;border-top:1px solid #e0e0e0;margin-top:24px;">
      <p style="margin:24px 0 0;font-family:${bf};font-size:11px;font-weight:400;color:#999999;line-height:1.6;">
        This invite expires in 7 days.
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s)
}
