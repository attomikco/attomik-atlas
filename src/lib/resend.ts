import { Resend } from 'resend'

// Shared Resend client — every outbound transactional email in this codebase
// goes through sendEmail() so the `from` address, domain config, and API key
// live in exactly one place.
//
// IMPORTANT: the client is constructed lazily. Newer versions of the Resend
// SDK throw `Missing API key` from the constructor when RESEND_API_KEY is
// undefined, which blew up Next.js's "Collecting page data" build phase on
// Vercel for any route file that transitively imported this module — even
// though the route itself never calls sendEmail at build time. Lazy
// instantiation defers the validation to the first actual call.

const DEFAULT_FROM = 'Attomik <invites@email.attomik.co>'

let cachedClient: Resend | null = null

function getResend(): Resend {
  if (!cachedClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error(
        'RESEND_API_KEY is not set. Add it to .env.local for local dev or to your Vercel project env vars.'
      )
    }
    cachedClient = new Resend(apiKey)
  }
  return cachedClient
}

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
  return getResend().emails.send({
    from: from || process.env.RESEND_FROM || DEFAULT_FROM,
    to,
    subject,
    html,
  })
}
