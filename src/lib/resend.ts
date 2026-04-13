import { Resend } from 'resend'

// Shared Resend client — every outbound transactional email in this codebase
// goes through sendEmail() so the `from` address, domain config, and API key
// live in exactly one place.
const resend = new Resend(process.env.RESEND_API_KEY!)

const DEFAULT_FROM = 'Attomik <invites@email.attomik.co>'

export async function sendEmail({
  to,
  subject,
  html,
  from,
}: {
  to: string
  subject: string
  html: string
  from?: string
}) {
  return resend.emails.send({
    from: from || process.env.RESEND_FROM || DEFAULT_FROM,
    to,
    subject,
    html,
  })
}
