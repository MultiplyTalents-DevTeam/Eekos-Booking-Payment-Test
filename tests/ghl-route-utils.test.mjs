import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeLocationFields,
  normalizeObjectSchemaFields,
  parseCommaSeparatedValues
} from "../api/_lib/ghl-route-utils.js";

test("parseCommaSeparatedValues normalizes strings and arrays", () => {
  assert.deepEqual(parseCommaSeparatedValues("a, b ,c"), ["a", "b", "c"]);
  assert.deepEqual(parseCommaSeparatedValues(["a,b", " c "]), ["a", "b", "c"]);
});

test("normalizeLocationFields reads common location custom field payload shapes", () => {
  assert.deepEqual(
    normalizeLocationFields({
      customFields: [
        {
          id: "field_room",
          name: "Room Name",
          fieldKey: "opportunity.room_name",
          type: "MULTIPLE_OPTIONS"
        }
      ]
    }),
    [
      {
        id: "field_room",
        name: "Room Name",
        key: "opportunity.room_name",
        type: "MULTIPLE_OPTIONS",
        options: null
      }
    ]
  );
});

test("normalizeObjectSchemaFields supports property-bag object schema responses", () => {
  assert.deepEqual(
    normalizeObjectSchemaFields({
      schema: {
        properties: {
          "opportunity.room_name": {
            id: "field_room",
            label: "Room Name",
            fieldType: "MULTIPLE_OPTIONS"
          }
        }
      }
    }),
    [
      {
        id: "field_room",
        name: "Room Name",
        key: "opportunity.room_name",
        type: "MULTIPLE_OPTIONS",
        options: null
      }
    ]
  );
});
