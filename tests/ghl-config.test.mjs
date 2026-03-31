import test from "node:test";
import assert from "node:assert/strict";

import {
  collectMissingGhlConfigPaths,
  hasLiveGhlId,
  isGhlConfigReady,
  resolveGhlConfig
} from "../src/js/ghl-config.js";

test("hasLiveGhlId rejects blank and placeholder values", () => {
  assert.equal(hasLiveGhlId(""), false);
  assert.equal(hasLiveGhlId("__SET_GHL_LOCATION_ID__"), false);
  assert.equal(hasLiveGhlId("abc123"), true);
});

test("resolveGhlConfig prefers env vars over placeholder file values", () => {
  const resolved = resolveGhlConfig({
    GHL_LOCATION_ID: "loc_env",
    GHL_RESERVATIONS_PIPELINE_ID: "pipe_env",
    GHL_FIELD_ROOM_NAME_ID: "field_env"
  }, {
    locationId: "__SET_GHL_LOCATION_ID__",
    calendars: {
      masterCalendarId: "cal_file"
    },
    pipeline: {
      reservationsPipelineId: "__SET_GHL_RESERVATIONS_PIPELINE_ID__",
      stages: {
        confirmedStageId: "stage_file"
      }
    },
    customFields: {
      roomNameFieldId: "__SET_GHL_FIELD_ROOM_NAME_ID__"
    }
  });

  assert.equal(resolved.locationId, "loc_env");
  assert.equal(resolved.calendars.masterCalendarId, "cal_file");
  assert.equal(resolved.pipeline.reservationsPipelineId, "pipe_env");
  assert.equal(resolved.customFields.roomNameFieldId, "field_env");
});

test("resolveGhlConfig accepts quoted values and fallback alias env names", () => {
  const resolved = resolveGhlConfig({
    GHL_RESERVATION_PIPELINE_ID: "\"pipe_alias\"",
    GHL_STAGE_WAITING_PAYMENT_ID: "'stage_alias'"
  }, {
    locationId: "__SET_GHL_LOCATION_ID__",
    calendars: {
      masterCalendarId: "cal_file"
    },
    pipeline: {
      reservationsPipelineId: "__SET_GHL_RESERVATIONS_PIPELINE_ID__",
      stages: {
        waitingForPaymentStageId: "__SET_GHL_STAGE_WAITING_FOR_PAYMENT_ID__"
      }
    },
    customFields: {}
  });

  assert.equal(resolved.pipeline.reservationsPipelineId, "pipe_alias");
  assert.equal(resolved.pipeline.stages.waitingForPaymentStageId, "stage_alias");
});

test("collectMissingGhlConfigPaths returns nested placeholder paths", () => {
  const result = collectMissingGhlConfigPaths({
    locationId: "loc_123",
    calendars: {
      masterCalendarId: "__SET_GHL_MASTER_CALENDAR_ID__"
    },
    pipeline: {
      reservationsPipelineId: "pipe_123",
      stages: {
        confirmedStageId: "__SET_GHL_STAGE_CONFIRMED_ID__"
      }
    }
  });

  assert.deepEqual(result, [
    "calendars.masterCalendarId",
    "pipeline.stages.confirmedStageId"
  ]);
});

test("isGhlConfigReady returns true only when all ids are live", () => {
  assert.equal(isGhlConfigReady({
    locationId: "loc_123",
    calendars: {
      masterCalendarId: "cal_123"
    },
    pipeline: {
      reservationsPipelineId: "pipe_123",
      stages: {
        confirmedStageId: "stage_123"
      }
    },
    customFields: {
      roomNameFieldId: "field_123"
    }
  }), true);

  assert.equal(isGhlConfigReady({
    locationId: "loc_123",
    calendars: {
      masterCalendarId: "__SET_GHL_MASTER_CALENDAR_ID__"
    }
  }), false);
});
