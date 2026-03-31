import { PAYMENT_CONFIG } from "../../src/js/config.js";
import { isPaymongoConfigReady, resolvePaymongoConfig } from "../_lib/paymongo.js";
import {
  buildHostedReturnUrls,
  resolveRequestBaseUrl,
  resolveVercelProductionBaseUrl
} from "../_lib/paymongo-callback-url.js";

function json(res, status, payload) {
  return res.status(status).json(payload);
}

function cleanString(value, maxLength = 500) {
  if (value == null) {
    return "";
  }

  return String(value)
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function maskSecret(value) {
  const normalized = cleanString(value, 200);

  if (!normalized) {
    return "";
  }

  if (normalized.length <= 10) {
    return "**********";
  }

  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

function toBooleanQuery(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

function uniqueByUrl(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    if (!item.url) {
      continue;
    }

    const key = item.url;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

async function probeUrl(url, includeOptions = false) {
  const methods = includeOptions ? ["HEAD", "GET", "OPTIONS"] : ["HEAD", "GET"];
  const probes = [];

  for (const method of methods) {
    try {
      const response = await fetch(url, {
        method,
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(7000),
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache"
        }
      });

      probes.push({
        method,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        finalUrl: cleanString(response.url, 600)
      });
    } catch (error) {
      probes.push({
        method,
        ok: false,
        status: 0,
        statusText: "request_failed",
        error: cleanString(error?.message || "Unknown error", 240)
      });
    }
  }

  return probes;
}

function buildCandidateUrls(req, paymongoConfig, env) {
  const requestBaseUrl = resolveRequestBaseUrl(req);
  const productionBaseUrl = resolveVercelProductionBaseUrl(env);
  const requestHosted = buildHostedReturnUrls(requestBaseUrl);
  const productionHosted = buildHostedReturnUrls(productionBaseUrl);

  return {
    requestBaseUrl,
    productionBaseUrl,
    urls: uniqueByUrl([
      {
        source: "configured_success_url",
        url: cleanString(paymongoConfig.successUrl, 600)
      },
      {
        source: "configured_cancel_url",
        url: cleanString(paymongoConfig.cancelUrl, 600)
      },
      {
        source: "request_origin_hosted_success",
        url: cleanString(requestHosted.successUrl, 600)
      },
      {
        source: "request_origin_hosted_cancel",
        url: cleanString(requestHosted.cancelUrl, 600)
      },
      {
        source: "vercel_production_hosted_success",
        url: cleanString(productionHosted.successUrl, 600)
      },
      {
        source: "vercel_production_hosted_cancel",
        url: cleanString(productionHosted.cancelUrl, 600)
      }
    ])
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    const paymongoConfig = resolvePaymongoConfig(process.env, PAYMENT_CONFIG);
    const includeOptions = toBooleanQuery(req.query?.options);
    const candidates = buildCandidateUrls(req, paymongoConfig, process.env);
    const probeResults = [];

    for (const candidate of candidates.urls) {
      const probes = await probeUrl(candidate.url, includeOptions);
      probeResults.push({
        source: candidate.source,
        url: candidate.url,
        probes
      });
    }

    return json(res, 200, {
      ok: true,
      route: "paymongo-debug-helper",
      ready: isPaymongoConfigReady(paymongoConfig),
      requestContext: {
        host: cleanString(req.headers?.host, 240),
        forwardedHost: cleanString(req.headers?.["x-forwarded-host"], 240),
        forwardedProto: cleanString(req.headers?.["x-forwarded-proto"], 40),
        requestBaseUrl: candidates.requestBaseUrl,
        productionBaseUrl: candidates.productionBaseUrl
      },
      configSummary: {
        currency: paymongoConfig.currency,
        paymentMethodTypes: paymongoConfig.paymentMethodTypes,
        appBaseUrl: paymongoConfig.appBaseUrl,
        successUrl: paymongoConfig.successUrl,
        cancelUrl: paymongoConfig.cancelUrl,
        secretKey: maskSecret(paymongoConfig.secretKey),
        webhookSecret: maskSecret(paymongoConfig.webhookSecret)
      },
      callbackUrlChecks: probeResults,
      next: "If any callback URL does not return 200 for HEAD and GET, PayMongo may reject checkout creation."
    });
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: cleanString(error instanceof Error ? error.message : "Unknown error", 300)
    });
  }
}
