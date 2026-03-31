function cleanValue(value, maxLength = 160) {
  if (value == null) {
    return "";
  }

  return String(value)
    .replace(/[<>"'`]/g, "")
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function html(reference, room) {
  const safeReference = cleanValue(reference, 120) || "N/A";
  const roomText = cleanValue(room, 120);
  const roomQuery = roomText ? `?room=${encodeURIComponent(roomText)}` : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Payment Not Completed | EEKOS</title>
  <style>
    body { margin: 0; font-family: Georgia, serif; background: #ece1d0; color: #173629; }
    .shell { max-width: 760px; margin: 42px auto; padding: 0 18px; }
    .card { background: #f7f2ea; border: 1px solid #d8cec0; border-radius: 22px; padding: 28px; }
    h1 { margin: 0 0 10px; font-size: 34px; line-height: 1.1; }
    p { margin: 0 0 12px; font-size: 17px; line-height: 1.6; }
    .ref { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: #6d8a73; margin-bottom: 14px; font-weight: 700; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; }
    a { text-decoration: none; border-radius: 999px; padding: 11px 18px; font-size: 14px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
    .primary { background: #1f5c43; color: #fff; border: 1px solid #1f5c43; }
    .ghost { color: #173629; border: 1px solid #d8cec0; background: #fff; }
  </style>
</head>
<body>
  <main class="shell">
    <section class="card">
      <div class="ref">Booking reference · ${safeReference}</div>
      <h1>Payment was not completed</h1>
      <p>Your room is not secured yet. You can return to payment review and complete checkout any time.</p>
      <div class="actions">
        <a class="primary" href="/payment.html">Return to payment</a>
        <a class="ghost" href="/room.html${roomQuery}">Back to room</a>
      </div>
    </section>
  </main>
</body>
</html>`;
}

export default function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const reference = cleanValue(req.query?.reference, 120);
  const room = cleanValue(req.query?.room, 120);

  if (req.method === "HEAD") {
    return res.status(200).end();
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(html(reference, room));
}
