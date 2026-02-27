import express from "express";
import cors from "cors";
import { chromium } from "playwright";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.GST_AUTOMATION_PORT || 8787;
const sessions = new Map();

async function launchSession(gstin) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--no-zygote",
    ],
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();

  await page.goto("https://services.gst.gov.in/services/searchtp", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const gstSelectors = [
    'input[name="gstin"]',
    'input#for_gstin',
    'input[placeholder*="GSTIN" i]',
    'input[type="text"]'
  ];

  let filled = false;
  for (const sel of gstSelectors) {
    const el = await page.$(sel);
    if (el) {
      await el.fill(gstin);
      filled = true;
      break;
    }
  }

  if (!filled) throw new Error("Could not locate GSTIN input on GST portal.");

  const captchaSelectors = ["img#imgCaptcha", "img.captcha-img", "img[src*='captcha']"];
  let captchaSrc = null;

  for (const sel of captchaSelectors) {
    const el = await page.$(sel);
    if (!el) continue;
    const src = await el.getAttribute("src");
    if (src) {
      if (src.startsWith("data:")) {
        captchaSrc = src;
      } else {
        const url = new URL(src, page.url()).toString();
        const resp = await page.request.get(url);
        const buf = await resp.body();
        captchaSrc = `data:image/png;base64,${buf.toString("base64")}`;
      }
      break;
    }
  }

  if (!captchaSrc) {
    const shot = await page.screenshot({ fullPage: true });
    captchaSrc = `data:image/png;base64,${shot.toString("base64")}`;
  }

  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, { browser, context, page, createdAt: Date.now() });

  return { sessionId, captchaImage: captchaSrc };
}

async function submitCaptcha(sessionId, captchaText) {
  const sess = sessions.get(sessionId);
  if (!sess) throw new Error("Session expired");
  const { page } = sess;

  const captchaInputSelectors = [
    'input[name="captcha"]',
    'input#fo-captcha',
    'input[placeholder*="captcha" i]'
  ];

  let captchaFilled = false;
  for (const sel of captchaInputSelectors) {
    const el = await page.$(sel);
    if (el) {
      await el.fill(captchaText);
      captchaFilled = true;
      break;
    }
  }
  if (!captchaFilled) throw new Error("Could not locate captcha input on GST portal.");

  const submitSelectors = [
    'button:has-text("SEARCH")',
    'button:has-text("Search")',
    'input[type="submit"]',
    'button[type="submit"]'
  ];

  let clicked = false;
  for (const sel of submitSelectors) {
    const el = await page.$(sel);
    if (el) {
      await Promise.all([page.waitForLoadState("domcontentloaded"), el.click()]);
      clicked = true;
      break;
    }
  }
  if (!clicked) throw new Error("Could not locate Search button on GST portal.");

  await page.waitForTimeout(1500);

  const pageText = await page.locator("body").innerText();
  const pick = (label) => {
    const re = new RegExp(`${label}\\s*[:\\-]?\\s*([^\\n\\r]+)`, "i");
    return pageText.match(re)?.[1]?.trim() || "";
  };

  const data = {
    legal_name: pick("Legal Name of Business") || pick("Legal Name"),
    trade_name: pick("Trade Name"),
    address: pick("Principal Place of Business") || pick("Address"),
    state: pick("State Jurisdiction") || pick("State"),
    mobile: pick("Mobile") || pick("Mobile No"),
    email: pick("Email") || pick("Email Address"),
    raw: pageText.slice(0, 5000),
  };

  return data;
}

async function closeSession(sessionId) {
  const sess = sessions.get(sessionId);
  if (!sess) return;
  try { await sess.context.close(); } catch {}
  try { await sess.browser.close(); } catch {}
  sessions.delete(sessionId);
}

app.post("/api/gst/start", async (req, res) => {
  try {
    const { gstin } = req.body || {};
    if (!gstin) return res.status(400).json({ error: "gstin is required" });
    const out = await launchSession(String(gstin).toUpperCase());
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message || "start failed" });
  }
});

app.post("/api/gst/submit", async (req, res) => {
  const { sessionId, captcha } = req.body || {};
  if (!sessionId || !captcha) return res.status(400).json({ error: "sessionId and captcha are required" });
  try {
    const data = await submitCaptcha(sessionId, String(captcha));
    await closeSession(sessionId);
    res.json({ data });
  } catch (e) {
    await closeSession(sessionId);
    res.status(500).json({ error: e.message || "submit failed" });
  }
});

app.post("/api/gst/close", async (req, res) => {
  const { sessionId } = req.body || {};
  await closeSession(sessionId);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`GST Playwright service running on http://0.0.0.0:${PORT}`);
});
