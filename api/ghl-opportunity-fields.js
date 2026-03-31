import {
  fetchGhlJson,
  normalizeObjectSchemaFields,
  parseCommaSeparatedValues,
  readGhlCredentials
} from "./_lib/ghl-route-utils.js";

const OPPORTUNITY_OBJECT_KEY = "opportunity";

export default async function handler(req, res) {
  try {
    const { token, locationId } = readGhlCredentials(process.env);

    if (!token) {
      return res.status(500).json({ ok: false, error: "Missing GHL_ACCESS_TOKEN" });
    }

    if (!locationId) {
      return res.status(500).json({ ok: false, error: "Missing GHL_LOCATION_ID" });
    }

    const wantedKeys = parseCommaSeparatedValues(req.query?.keys || process.env.GHL_WANTED_OPPORTUNITY_FIELD_KEYS);
    const result = await fetchGhlJson(
      `/objects/${OPPORTUNITY_OBJECT_KEY}?locationId=${encodeURIComponent(locationId)}`,
      token,
      {
      method: "GET"
      }
    );

    if (!result.ok) {
      return res.status(result.status).json({
        ok: false,
        status: result.status,
        statusText: result.statusText,
        body: result.body,
        objectKey: OPPORTUNITY_OBJECT_KEY
      });
    }

    const normalizedFields = normalizeObjectSchemaFields(result.body);
    const matches = wantedKeys.length
      ? normalizedFields.filter((field) => wantedKeys.includes(field.key))
      : normalizedFields;

    return res.status(200).json({
      ok: true,
      locationId,
      source: "opportunity_object_schema",
      objectKey: OPPORTUNITY_OBJECT_KEY,
      wantedKeys,
      found: matches.length,
      totalFields: normalizedFields.length,
      matches
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
