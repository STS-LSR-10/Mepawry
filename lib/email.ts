// lib/email.ts — Resend Transactional Email Helper

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key')

/**
 * ส่ง Magic Link สำหรับกู้คืนหรือแก้ไขศาลสัตว์เลี้ยง
 */
export async function sendMagicLinkEmail({
  to,
  petName,
  editUrl,
}: {
  to: string
  petName: string
  editUrl: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[Mock Email] To: ${to} | Subject: Edit link for ${petName} | Link: ${editUrl}`)
    return { success: true, mock: true }
  }

  return await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Mepawry <noreply@pawmemorial.com>',
    to,
    subject: `Your memorial edit key for ${petName} 🕯️`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #2A1E17;">
        <h2 style="font-family: Georgia, serif; color: #D9823B;">A place that never forgets</h2>
        <p>Hello,</p>
        <p>Thank you for giving <strong>${petName}</strong> a permanent place in the memorial hall.</p>
        <p>You can use the private link below anytime to update their photos, dates, or memories:</p>
        <p style="margin: 24px 0;">
          <a href="${editUrl}" style="background-color: #D9823B; color: #ffffff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; display: inline-block;">
            Manage ${petName}'s Memorial
          </a>
        </p>
        <p style="color: #8E8278; font-size: 12px;">This link is confidential. Do not forward it to others.</p>
      </div>
    `,
  })
}
