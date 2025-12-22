import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  tenantName: string;
  role: 'ADMIN' | 'MEMBER';
  inviteUrl: string;
  expiresAt: Date;
}

export async function sendInvitationEmail({
  to,
  inviterName,
  tenantName,
  role,
  inviteUrl,
  expiresAt,
}: SendInvitationEmailParams): Promise<{ success: boolean; error?: string }> {
  // Resend APIキーが設定されていない場合はスキップ
  if (!process.env.RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set, skipping email send');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const roleText = role === 'ADMIN' ? '管理者' : 'メンバー';
  const expiresAtText = expiresAt.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@resend.dev';

  try {
    const { error } = await resend.emails.send({
      from: `資材発注管理システム <${fromEmail}>`,
      to: [to],
      subject: `【${tenantName}】資材発注管理システムへの招待`,
      html: `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #334155; padding: 30px 40px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                        資材発注管理システム
                      </h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px;">
                        ${tenantName}への招待
                      </h2>

                      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        ${inviterName}さんから、${tenantName}の資材発注管理システムに招待されました。
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 6px; margin: 20px 0;">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0;">
                              <strong>招待された権限：</strong> ${roleText}
                            </p>
                            <p style="color: #64748b; font-size: 14px; margin: 0;">
                              <strong>有効期限：</strong> ${expiresAtText}
                            </p>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                        下記のボタンをクリックして、アカウント登録を完了してください。
                      </p>

                      <!-- Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${inviteUrl}" style="display: inline-block; background-color: #334155; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                              アカウント登録へ進む
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                        ボタンが機能しない場合は、以下のURLをブラウザに貼り付けてください：<br>
                        <a href="${inviteUrl}" style="color: #3b82f6; word-break: break-all;">${inviteUrl}</a>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 20px 40px; border-top: 1px solid #e2e8f0;">
                      <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
                        このメールは${tenantName}の管理者から送信されました。<br>
                        心当たりがない場合は、このメールを無視してください。
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending invitation email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
