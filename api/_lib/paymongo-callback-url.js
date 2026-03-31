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

function firstHeaderValue(value) {
  return cleanString(Array.isArray(value) ? value[0] : String(value || "").split(",")[0], 240);
}

export function resolveRequestBaseUrl(req) {
  const forwardedProto = firstHeaderValue(req?.headers?.["x-forwarded-proto"]);
  const forwardedHost = firstHeaderValue(req?.headers?.["x-forwarded-host"]);
  const host = forwardedHost || firstHeaderValue(req?.headers?.host);
  const protocol = forwardedProto || (host.includes("localhost") ? "http" : "https");

  if (!host) {
    return "";
  }

  return `${protocol}://${host}`;
}

export function buildHostedReturnUrls(baseUrl) {
  const normalizedBase = cleanString(baseUrl, 240).replace(/\/+$/, "");

  if (!normalizedBase) {
    return {
      successUrl: "",
      cancelUrl: ""
    };
  }

  return {
    successUrl: `${normalizedBase}/api/paymongo/return-success`,
    cancelUrl: `${normalizedBase}/api/paymongo/return-cancelled`
  };
}

export function resolveVercelProductionBaseUrl(env = process.env) {
  const projectProductionHost = cleanString(env.VERCEL_PROJECT_PRODUCTION_URL, 240);
  if (projectProductionHost) {
    return `https://${projectProductionHost.replace(/^https?:\/\//i, "")}`;
  }

  return "";
}
