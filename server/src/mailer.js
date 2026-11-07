import nodemailer from 'nodemailer';

let transport = null;
if (process.env.SMTP_HOST) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

// Replaces the PHP mail() call in gameDataGateway.php addPenalty().
export async function sendGameMisconductNotice(gamesId) {
  const to = process.env.MISCONDUCT_NOTIFY_TO;
  if (!transport || !to) {
    console.warn(`[mailer] SMTP not configured; skipped game misconduct email for game ${gamesId}`);
    return;
  }
  const site = process.env.PUBLIC_SITE_URL || 'http://tottenhammensleague.com';
  await transport.sendMail({
    from: process.env.MAIL_FROM || to,
    to,
    subject: 'Game Misconduct Penalty Issued',
    html: `There was a game misconduct penalty issued.  Details can be viewed <a href="${site}/game/?gamesId=${encodeURIComponent(gamesId)}">here</a>.`,
  });
}
