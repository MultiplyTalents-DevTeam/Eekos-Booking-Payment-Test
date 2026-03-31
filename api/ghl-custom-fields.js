const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

function parseWantedKeys(input) {
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

function normalizeField(field, fallbackKey = null) {
  return {
    id: field?.id || field?._id || field?.fieldId || null,
    name: field?.name || field?.label || field?.title || fallbackKey || null,
    key: field?.fieldKey || field?.key || field?.slug || fallbackKey,
    type: field?.type || field?.dataType || field?.fieldType || null,
    options: field?.options || field?.values || field?.enum || null
  };
}

function normalizeLocationFields(payload) {
  const fields = payload?.customFields || payload?.fields || payload?.data?.customFields || payload?.data?.fields || [];

  return Array.isArray(fields)
    ? fields.map((field) => normalizeField(field))
    : [];
}

function normalizeObjectSchemaFields(payload) {
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

export default async function handler(req, res) {
  try {
    const token = process.env.GHL_ACCESS_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    const objectKey = req.query?.object ? String(req.query.object).trim() : "";

    if (!token) {
      return res.status(500).json({ ok: false, error: "Missing GHL_ACCESS_TOKEN" });
    }

    if (!locationId) {
      return res.status(500).json({ ok: false, error: "Missing GHL_LOCATION_ID" });
    }

    const wantedKeys = parseWantedKeys(req.query?.keys || process.env.GHL_WANTED_FIELD_KEYS);
    const url = objectKey
      ? `${GHL_BASE_URL}/objects/${encodeURIComponent(objectKey)}`
      : `${GHL_BASE_URL}/locations/${locationId}/customFields`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: GHL_API_VERSION,
        Accept: "application/json"
      }
    });

    const text = await response.text();
    let json = null;

    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        status: response.status,
        statusText: response.statusText,
        body: json || text
      });
    }

    const normalizedFields = objectKey
      ? normalizeObjectSchemaFields(json)
      : normalizeLocationFields(json);

    const matches = wantedKeys.length
      ? normalizedFields.filter((field) => wantedKeys.includes(field.key))
      : normalizedFields;

    return res.status(200).json({
      ok: true,
      locationId,
      source: objectKey ? "object_schema" : "location_custom_fields",
      objectKey: objectKey || null,
      wantedKeys,
      found: matches.length,
      totalCustomFields: normalizedFields.length,
      matches
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
