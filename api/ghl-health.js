import {
  GHL_CONFIG,
  hasLiveGhlId,
  summarizeGhlConfig
} from "../src/js/ghl-config.js";

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

function getId(item) {
  return item?.id || item?._id || item?.fieldId || null;
}

function getName(item) {
  return item?.name || item?.label || item?.title || null;
}

function toLookup(items) {
  return new Map(
    items
      .map((item) => [getId(item), item])
      .filter(([id]) => typeof id === "string" && id.trim() !== "")
  );
}

function normalizeCustomFields(payload) {
  const raw = payload?.customFields || payload?.fields || payload?.data?.customFields || payload?.data?.fields || [];

  return Array.isArray(raw)
    ? raw.map((field) => ({
      id: getId(field),
      name: field?.name || null,
      key: field?.fieldKey || field?.key || null
    }))
    : [];
}

function normalizeCalendars(payload) {
  const raw = payload?.calendars || payload?.calendar || payload?.data?.calendars || payload?.data || [];

  return Array.isArray(raw)
    ? raw.map((calendar) => ({
      id: getId(calendar),
      name: getName(calendar),
      slug: calendar?.slug || null
    }))
    : [];
}

function normalizePipelines(payload) {
  const raw = payload?.pipelines || payload?.data?.pipelines || payload?.data || [];

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((pipeline) => ({
    id: getId(pipeline),
    name: getName(pipeline),
    stages: Array.isArray(pipeline?.stages)
      ? pipeline.stages.map((stage) => ({
        id: getId(stage),
        name: getName(stage)
      }))
      : []
  }));
}

function buildEntityCheck(label, configuredId, lookup) {
  if (!hasLiveGhlId(configuredId)) {
    return {
      label,
      configuredId: configuredId || null,
      configured: false,
      exists: false,
      reason: "placeholder_or_missing"
    };
  }

  const match = lookup.get(configuredId) || null;

  return {
    label,
    configuredId,
    configured: true,
    exists: Boolean(match),
    name: match ? getName(match) : null
  };
}

function buildFieldChecks(fieldLookup) {
  return Object.entries(GHL_CONFIG.customFields).reduce((accumulator, [configKey, configuredId]) => {
    accumulator[configKey] = buildEntityCheck(configKey, configuredId, fieldLookup);
    return accumulator;
  }, {});
}

function buildStageChecks(stageLookup) {
  return Object.entries(GHL_CONFIG.pipeline.stages).reduce((accumulator, [configKey, configuredId]) => {
    accumulator[configKey] = buildEntityCheck(configKey, configuredId, stageLookup);
    return accumulator;
  }, {});
}

async function fetchGhl(resourcePath, token, query = {}) {
  const url = new URL(`${GHL_BASE_URL}${resourcePath}`);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
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

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    url: url.toString(),
    json,
    rawBody: json ? null : text
  };
}

function summarizeEndpoint(result, items, sampleFormatter) {
  return {
    ok: result.ok,
    status: result.status,
    statusText: result.statusText,
    url: result.url,
    count: items.length,
    sample: items[0] ? sampleFormatter(items[0]) : null,
    errorBody: result.ok ? null : (result.json || result.rawBody || null)
  };
}

export default async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const token = process.env.GHL_ACCESS_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!token) {
      return res.status(500).json({ ok: false, error: "Missing GHL_ACCESS_TOKEN" });
    }

    if (!locationId) {
      return res.status(500).json({ ok: false, error: "Missing GHL_LOCATION_ID" });
    }

    const configSummary = summarizeGhlConfig(GHL_CONFIG);

    const [customFieldsResult, calendarsResult, pipelinesResult] = await Promise.all([
      fetchGhl(`/locations/${locationId}/customFields`, token),
      fetchGhl("/calendars/", token, { locationId }),
      fetchGhl("/opportunities/pipelines", token, { locationId })
    ]);

    const customFields = normalizeCustomFields(customFieldsResult.json);
    const calendars = normalizeCalendars(calendarsResult.json);
    const pipelines = normalizePipelines(pipelinesResult.json);

    const downstreamOk = customFieldsResult.ok && calendarsResult.ok && pipelinesResult.ok;

    const calendarLookup = toLookup(calendars);
    const fieldLookup = toLookup(customFields);
    const pipelineLookup = toLookup(pipelines);

    const configuredPipelineId = GHL_CONFIG.pipeline.reservationsPipelineId;
    const pipelineMatch = hasLiveGhlId(configuredPipelineId)
      ? pipelineLookup.get(configuredPipelineId) || null
      : null;
    const stageLookup = toLookup(pipelineMatch?.stages || []);

    const checks = {
      locationId: {
        configuredId: locationId,
        configured: true
      },
      masterCalendar: buildEntityCheck("masterCalendarId", GHL_CONFIG.calendars.masterCalendarId, calendarLookup),
      reservationsPipeline: buildEntityCheck("reservationsPipelineId", configuredPipelineId, pipelineLookup),
      stages: buildStageChecks(stageLookup),
      customFields: buildFieldChecks(fieldLookup)
    };

    const payload = {
      ok: downstreamOk && configSummary.ready,
      locationId,
      configReady: configSummary.ready,
      missingConfigPaths: configSummary.missingPaths,
      endpoints: {
        customFields: summarizeEndpoint(customFieldsResult, customFields, (field) => ({
          id: field.id,
          name: field.name,
          key: field.key
        })),
        calendars: summarizeEndpoint(calendarsResult, calendars, (calendar) => ({
          id: calendar.id,
          name: calendar.name,
          slug: calendar.slug
        })),
        pipelines: summarizeEndpoint(pipelinesResult, pipelines, (pipeline) => ({
          id: pipeline.id,
          name: pipeline.name,
          stageCount: Array.isArray(pipeline.stages) ? pipeline.stages.length : 0
        }))
      },
      checks
    };

    if (!downstreamOk) {
      return res.status(502).json(payload);
    }

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
