import test from "node:test";
import assert from "node:assert/strict";

import {
  collectMissingGhlConfigPaths,
  hasLiveGhlId,
  isGhlConfigReady
} from "../src/js/ghl-config.js";

test("hasLiveGhlId rejects blank and placeholder values", () => {
  assert.equal(hasLiveGhlId(""), false);
  assert.equal(hasLiveGhlId("__SET_GHL_LOCATION_ID__"), false);
  assert.equal(hasLiveGhlId("abc123"), true);
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
