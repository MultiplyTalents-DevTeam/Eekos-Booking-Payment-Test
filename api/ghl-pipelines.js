const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

function parseWantedIds(input) {
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

    const wantedPipelineIds = parseWantedIds(req.query?.pipelineIds || process.env.GHL_WANTED_PIPELINE_IDS);

    const response = await fetch(`${GHL_BASE_URL}/opportunities/pipelines?locationId=${encodeURIComponent(locationId)}`, {
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

    const pipelines = json?.pipelines || json?.data?.pipelines || json?.data || [];
    const normalizedPipelines = Array.isArray(pipelines)
      ? pipelines.map((pipeline) => ({
        id: pipeline?.id || pipeline?._id || null,
        name: pipeline?.name || pipeline?.title || null,
        stages: Array.isArray(pipeline?.stages)
          ? pipeline.stages.map((stage) => ({
            id: stage?.id || stage?._id || null,
            name: stage?.name || stage?.title || null
          }))
          : []
      }))
      : [];

    const matches = wantedPipelineIds.length
      ? normalizedPipelines.filter((pipeline) => wantedPipelineIds.includes(pipeline.id))
      : normalizedPipelines;

    return res.status(200).json({
      ok: true,
      locationId,
      wantedPipelineIds,
      found: matches.length,
      totalPipelines: normalizedPipelines.length,
      pipelines: matches
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
