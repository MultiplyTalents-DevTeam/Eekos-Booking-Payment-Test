import { hasLiveGhlId, resolveGhlConfig } from "../src/js/ghl-config.js";
import { resolveInboundWebhookUrl } from "./_lib/ghl-webhook-dispatch.js";

function safeText(value) {
  if (value == null) {
    return "";
  }

  return String(value)
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .trim();
}

function maskValue(value, { showValue = false } = {}) {
  const normalized = safeText(value);

  if (!normalized) {
    return {
      present: false,
      length: 0,
      preview: ""
    };
  }

  if (showValue) {
    return {
      present: true,
      length: normalized.length,
      preview: normalized
    };
  }

  const left = normalized.slice(0, 4);
  const right = normalized.slice(-4);

  return {
    present: true,
    length: normalized.length,
    preview: normalized.length <= 8 ? "********" : `${left}...${right}`
  };
}

function hasKey(env, key) {
  return Object.prototype.hasOwnProperty.call(env, key);
}

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const config = resolveGhlConfig(process.env);
  const inboundWebhookUrl = resolveInboundWebhookUrl(process.env);
  const ghlKeys = Object.keys(process.env)
    .filter((key) => key.startsWith("GHL_"))
    .sort();

  return res.status(200).json({
    ok: true,
    route: "ghl-env-debug",
    vercel: {
      env: safeText(process.env.VERCEL_ENV),
      region: safeText(process.env.VERCEL_REGION),
      url: safeText(process.env.VERCEL_URL),
      projectProductionUrl: safeText(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    },
    seenGhlKeys: ghlKeys,
    rawEnvPresence: {
      GHL_ACCESS_TOKEN: hasKey(process.env, "GHL_ACCESS_TOKEN"),
      GHL_LOCATION_ID: hasKey(process.env, "GHL_LOCATION_ID"),
      GHL_RESERVATIONS_PIPELINE_ID: hasKey(process.env, "GHL_RESERVATIONS_PIPELINE_ID"),
      GHL_STAGE_WAITING_FOR_PAYMENT_ID: hasKey(process.env, "GHL_STAGE_WAITING_FOR_PAYMENT_ID"),
      GHL_INBOUND_WEBHOOK_URL: hasKey(process.env, "GHL_INBOUND_WEBHOOK_URL"),
      GHL_WEBHOOK_URL: hasKey(process.env, "GHL_WEBHOOK_URL"),
      GHL_WEBHOOK_UR: hasKey(process.env, "GHL_WEBHOOK_UR")
    },
    values: {
      GHL_LOCATION_ID: maskValue(process.env.GHL_LOCATION_ID, { showValue: true }),
      GHL_RESERVATIONS_PIPELINE_ID: maskValue(process.env.GHL_RESERVATIONS_PIPELINE_ID, { showValue: true }),
      GHL_STAGE_WAITING_FOR_PAYMENT_ID: maskValue(process.env.GHL_STAGE_WAITING_FOR_PAYMENT_ID, { showValue: true }),
      GHL_WEBHOOK_URL: maskValue(process.env.GHL_WEBHOOK_URL, { showValue: true }),
      GHL_INBOUND_WEBHOOK_URL: maskValue(process.env.GHL_INBOUND_WEBHOOK_URL, { showValue: true }),
      GHL_ACCESS_TOKEN: maskValue(process.env.GHL_ACCESS_TOKEN)
    },
    resolved: {
      locationId: config.locationId,
      reservationsPipelineId: config.pipeline.reservationsPipelineId,
      waitingForPaymentStageId: config.pipeline.stages.waitingForPaymentStageId,
      inboundWebhookUrl,
      checks: {
        GHL_LOCATION_ID: hasLiveGhlId(config.locationId),
        GHL_RESERVATIONS_PIPELINE_ID: hasLiveGhlId(config.pipeline.reservationsPipelineId),
        GHL_STAGE_WAITING_FOR_PAYMENT_ID: hasLiveGhlId(config.pipeline.stages.waitingForPaymentStageId),
        GHL_INBOUND_WEBHOOK_URL: Boolean(inboundWebhookUrl)
      }
    }
  });
}
