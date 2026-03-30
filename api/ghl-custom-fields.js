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

export default async function handler(req, res) {
  try {
    const token = process.env.GHL_ACCESS_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!token) {
      return res.status(500).json({ ok: false, error: "Missing GHL_ACCESS_TOKEN" });
    }

    if (!locationId) {
      return res.status(500).json({ ok: false, error: "Missing GHL_LOCATION_ID" });
    }

    const wantedKeys = parseWantedKeys(req.query?.keys || process.env.GHL_WANTED_FIELD_KEYS);

    const response = await fetch(`${GHL_BASE_URL}/locations/${locationId}/customFields`, {
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

    const fields = json?.customFields || json?.fields || json?.data?.customFields || json?.data?.fields || [];
    const normalizedFields = Array.isArray(fields)
      ? fields.map((field) => ({
        id: field?.id || field?._id || null,
        name: field?.name || null,
        key: field?.fieldKey || field?.key || null,
        type: field?.type || null,
        options: field?.options || field?.values || null
      }))
      : [];

    const matches = wantedKeys.length
      ? normalizedFields.filter((field) => wantedKeys.includes(field.key))
      : normalizedFields;

    return res.status(200).json({
      ok: true,
      locationId,
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
