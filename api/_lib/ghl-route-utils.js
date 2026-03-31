export const GHL_BASE_URL = "https://services.leadconnectorhq.com";
export const GHL_API_VERSION = "2021-07-28";

export function parseCommaSeparatedValues(input) {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input
      .flatMap((value) => String(value).split(","))
      .map((value) => value.trim())
      .filter(Boolean);
  }

  return String(input)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function readGhlCredentials(processEnv) {
  const token = processEnv.GHL_ACCESS_TOKEN;
  const locationId = processEnv.GHL_LOCATION_ID;

  return { token, locationId };
}

export async function fetchGhlJson(path, token, init = {}) {
  const response = await fetch(`${GHL_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Version: GHL_API_VERSION,
      Accept: "application/json",
      ...(init.headers || {})
    }
  });

  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    body: json || text
  };
}

export function normalizeField(field, fallbackKey = null) {
  return {
    id: field?.id || field?._id || field?.fieldId || null,
    name: field?.name || field?.label || field?.title || fallbackKey || null,
    key: field?.fieldKey || field?.key || field?.slug || fallbackKey,
    type: field?.type || field?.dataType || field?.fieldType || null,
    options: field?.options || field?.values || field?.enum || null
  };
}

export function normalizeLocationFields(payload) {
  const fields = payload?.customFields || payload?.fields || payload?.data?.customFields || payload?.data?.fields || [];

  return Array.isArray(fields)
    ? fields.map((field) => normalizeField(field))
    : [];
}

export function normalizeObjectSchemaFields(payload) {
  const candidates = [
    payload?.fields,
    payload?.schema?.fields,
    payload?.data?.fields,
    payload?.data?.schema?.fields,
    payload?.object?.fields
  ];

  const matchedArray = candidates.find((value) => Array.isArray(value));

  if (matchedArray) {
    return matchedArray.map((field) => normalizeField(field));
  }

  const propertyBag = payload?.properties
    || payload?.schema?.properties
    || payload?.data?.properties
    || payload?.data?.schema?.properties
    || null;

  if (!propertyBag || typeof propertyBag !== "object") {
    return [];
  }

  return Object.entries(propertyBag).map(([key, value]) => normalizeField(value, key));
}
