interface EventInfo {
  id: string;
  address: string;
  city: string;
  date: string;
  startTime: string;
  endTime: string;
  realtorName: string;
}

const APP_URL = "https://openhousemap.online";

const shellStyle = `
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Rubik, "Helvetica Neue", Arial, sans-serif;
  direction: rtl;
  background: #F6F8F2;
  margin: 0;
  padding: 24px 12px;
  color: #141C0A;
  line-height: 1.5;
`;

const cardStyle = `
  max-width: 560px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 16px;
  padding: 28px 24px;
  box-shadow: 0 4px 20px rgba(20,28,10,0.06);
`;

const buttonStyle = `
  display: inline-block;
  padding: 12px 22px;
  background: #141C0A;
  color: #F6F8F2;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 600;
  font-size: 15px;
  margin: 16px 0 6px;
`;

const footerStyle = `
  font-size: 12px;
  color: #4A6E30;
  margin-top: 28px;
  padding-top: 16px;
  border-top: 1px solid #F0E8D0;
  text-align: center;
`;

function shell(title: string, body: string, unsubscribeNote = true): string {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
</head>
<body style="${shellStyle}">
  <div style="${cardStyle}">
    ${body}
    <div style="${footerStyle}">
      <a href="${APP_URL}" style="color:#4A6E30;text-decoration:none;font-weight:600;">OpenHouse Map</a>
      <span style="margin: 0 8px;">·</span>
      <a href="${APP_URL}/privacy" style="color:#4A6E30;text-decoration:none;">פרטיות</a>
      ${
        unsubscribeNote
          ? `<br><span style="color:#4A6E30;opacity:0.7;margin-top:6px;display:inline-block;">להסרה מרשימת התפוצה השב על מייל זה</span>`
          : ""
      }
    </div>
  </div>
</body>
</html>`;
}

export function eventCancelledTemplate(ev: EventInfo) {
  const body = `
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;">האירוע בוטל</h1>
    <p style="margin:0 0 8px;color:#4A6E30;font-size:14px;">${ev.realtorName} ביטל/ה את ה-Open House:</p>
    <p style="margin:12px 0;font-size:18px;font-weight:600;">${ev.address}</p>
    <p style="margin:8px 0;font-size:14px;color:#4A6E30;">
      ${ev.city} · ${ev.date} · <span dir="ltr">${ev.startTime}–${ev.endTime}</span>
    </p>
    <p style="margin:18px 0 0;font-size:14px;">
      ה-RSVP שלך הוסר אוטומטית. אנו מתנצלים על אי הנעימות.
    </p>
    <a href="${APP_URL}" style="${buttonStyle}">למפת אירועים אחרים</a>
  `;
  return {
    subject: `Open House בוטל — ${ev.address}`,
    html: shell("Open House בוטל", body),
  };
}

export function eventUpdatedTemplate(
  ev: EventInfo,
  changes: { field: string; before: string; after: string }[]
) {
  const changesList = changes
    .map(
      (c) =>
        `<li style="margin-bottom:4px;"><strong>${c.field}:</strong> <span style="text-decoration:line-through;color:#C04848;">${c.before}</span> → <span style="color:#4A9B5C;font-weight:600;">${c.after}</span></li>`
    )
    .join("");

  const body = `
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;">פרטי האירוע עודכנו</h1>
    <p style="margin:0 0 8px;color:#4A6E30;font-size:14px;">${ev.realtorName} עדכן/ה את ה-Open House:</p>
    <p style="margin:12px 0;font-size:18px;font-weight:600;">${ev.address}</p>
    <ul style="margin:14px 0;padding-inline-start:18px;font-size:14px;">${changesList}</ul>
    <a href="${APP_URL}/e/${ev.id}" style="${buttonStyle}">לדף האירוע</a>
  `;
  return {
    subject: `Open House עודכן — ${ev.address}`,
    html: shell("Open House עודכן", body),
  };
}

export function postEventFeedbackTemplate(ev: EventInfo) {
  const body = `
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;">תודה שהשתתפת!</h1>
    <p style="margin:0 0 10px;font-size:15px;">תרצה להעניק פידבק קצר על ה-Open House?</p>
    <p style="margin:8px 0;font-size:14px;color:#4A6E30;">
      ${ev.address} · ${ev.date}
    </p>
    <p style="margin:16px 0;font-size:14px;">
      הפידבק יעזור ל-${ev.realtorName} ולקולגות לקבל תמונה אמיתית של השוק. ייקח לך פחות מדקה.
    </p>
    <a href="${APP_URL}/e/${ev.id}/feedback" style="${buttonStyle}">למילוי הפידבק</a>
  `;
  return {
    subject: `פידבק על Open House — ${ev.address}`,
    html: shell("פידבק על Open House", body),
  };
}

export function welcomeTemplate(name: string) {
  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;">ברוך הבא ל-OpenHouse Map</h1>
    <p style="margin:8px 0;font-size:15px;">שלום ${name},</p>
    <p style="margin:8px 0;font-size:14px;">
      החשבון שלך אומת בהצלחה מול רשימת המתווכים של משרד המשפטים.
      אתה יכול עכשיו לפרסם אירועי Open House, לסמן RSVP על אירועים של קולגות, ולהשתמש בכל הפיצ׳רים של הפלטפורמה.
    </p>
    <a href="${APP_URL}/create" style="${buttonStyle}">פרסום אירוע ראשון</a>
    <p style="margin:18px 0 0;font-size:13px;color:#4A6E30;">
      שאלה? פנייה? פשוט השב על מייל זה.
    </p>
  `;
  return {
    subject: "ברוך הבא ל-OpenHouse Map",
    html: shell("ברוך הבא", body, false),
  };
}
