export const GHL_ID_PLACEHOLDER_PREFIX = "__SET_GHL_";

export const GHL_CONFIG = {
  locationId: "__SET_GHL_LOCATION_ID__",
  calendars: {
    masterCalendarId: "__SET_GHL_MASTER_CALENDAR_ID__"
  },
  pipeline: {
    reservationsPipelineId: "__SET_GHL_RESERVATIONS_PIPELINE_ID__",
    stages: {
      newInquiryStageId: "__SET_GHL_STAGE_NEW_INQUIRY_ID__",
      waitingForPaymentStageId: "__SET_GHL_STAGE_WAITING_FOR_PAYMENT_ID__",
      paymentReceivedStageId: "__SET_GHL_STAGE_PAYMENT_RECEIVED_ID__",
      confirmedStageId: "__SET_GHL_STAGE_CONFIRMED_ID__",
      inquiryOnlyStageId: "__SET_GHL_STAGE_INQUIRY_ONLY_ID__",
      expiredStageId: "__SET_GHL_STAGE_EXPIRED_ID__",
      cancelledStageId: "__SET_GHL_STAGE_CANCELLED_ID__",
      noShowStageId: "__SET_GHL_STAGE_NO_SHOW_ID__",
      completedStageId: "__SET_GHL_STAGE_COMPLETED_ID__"
    }
  },
  customFields: {
    roomNameFieldId: "__SET_GHL_FIELD_ROOM_NAME_ID__",
    checkInDateFieldId: "__SET_GHL_FIELD_CHECK_IN_DATE_ID__",
    checkOutDateFieldId: "__SET_GHL_FIELD_CHECK_OUT_DATE_ID__",
    reservationStatusFieldId: "__SET_GHL_FIELD_RESERVATION_STATUS_ID__",
    paymentStatusFieldId: "__SET_GHL_FIELD_PAYMENT_STATUS_ID__",
    finalTotalAmountFieldId: "__SET_GHL_FIELD_FINAL_TOTAL_AMOUNT_ID__",
    holdExpiresAtFieldId: "__SET_GHL_FIELD_HOLD_EXPIRES_AT_ID__",
    specialRequestsFieldId: "__SET_GHL_FIELD_SPECIAL_REQUESTS_ID__",
    adultCountFieldId: "__SET_GHL_FIELD_ADULT_COUNT_ID__",
    childCountFieldId: "__SET_GHL_FIELD_CHILD_COUNT_ID__",
    paymentReferenceFieldId: "__SET_GHL_FIELD_PAYMENT_REFERENCE_ID__",
    reservationReferenceFieldId: "__SET_GHL_FIELD_RESERVATION_REFERENCE_ID__",
    calendarStatusFieldId: "__SET_GHL_FIELD_CALENDAR_STATUS_ID__",
    depositAmountDueFieldId: "__SET_GHL_FIELD_DEPOSIT_AMOUNT_DUE_ID__"
  }
};

function cleanEnvValue(value) {
  if (value == null) {
    return "";
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return "";
  }

  return normalized
    .replace(/^['"]+/, "")
    .replace(/['"]+$/, "")
    .trim();
}

function readEnvValue(env, keys = []) {
  for (const key of keys) {
    const value = cleanEnvValue(env?.[key]);
    if (value) {
      return value;
    }
  }

  return "";
}

export function resolveGhlConfig(env = {}, baseConfig = GHL_CONFIG) {
  return {
    locationId: readEnvValue(env, ["GHL_LOCATION_ID"]) || baseConfig.locationId,
    calendars: {
      masterCalendarId: readEnvValue(env, ["GHL_MASTER_CALENDAR_ID"]) || baseConfig.calendars.masterCalendarId
    },
    pipeline: {
      reservationsPipelineId: readEnvValue(env, [
        "GHL_RESERVATIONS_PIPELINE_ID",
        "GHL_RESERVATION_PIPELINE_ID",
        "GHL_PIPELINE_ID"
      ]) || baseConfig.pipeline.reservationsPipelineId,
      stages: {
        newInquiryStageId: readEnvValue(env, ["GHL_STAGE_NEW_INQUIRY_ID"]) || baseConfig.pipeline.stages.newInquiryStageId,
        waitingForPaymentStageId: readEnvValue(env, [
          "GHL_STAGE_WAITING_FOR_PAYMENT_ID",
          "GHL_STAGE_WAITING_PAYMENT_ID",
          "GHL_STAGE_AWAITING_PAYMENT_ID"
        ]) || baseConfig.pipeline.stages.waitingForPaymentStageId,
        paymentReceivedStageId: readEnvValue(env, ["GHL_STAGE_PAYMENT_RECEIVED_ID"]) || baseConfig.pipeline.stages.paymentReceivedStageId,
        confirmedStageId: readEnvValue(env, ["GHL_STAGE_CONFIRMED_ID"]) || baseConfig.pipeline.stages.confirmedStageId,
        inquiryOnlyStageId: readEnvValue(env, ["GHL_STAGE_INQUIRY_ONLY_ID"]) || baseConfig.pipeline.stages.inquiryOnlyStageId,
        expiredStageId: readEnvValue(env, ["GHL_STAGE_EXPIRED_ID"]) || baseConfig.pipeline.stages.expiredStageId,
        cancelledStageId: readEnvValue(env, ["GHL_STAGE_CANCELLED_ID"]) || baseConfig.pipeline.stages.cancelledStageId,
        noShowStageId: readEnvValue(env, ["GHL_STAGE_NO_SHOW_ID"]) || baseConfig.pipeline.stages.noShowStageId,
        completedStageId: readEnvValue(env, ["GHL_STAGE_COMPLETED_ID"]) || baseConfig.pipeline.stages.completedStageId
      }
    },
    customFields: {
      roomNameFieldId: readEnvValue(env, ["GHL_FIELD_ROOM_NAME_ID"]) || baseConfig.customFields.roomNameFieldId,
      checkInDateFieldId: readEnvValue(env, ["GHL_FIELD_CHECK_IN_DATE_ID"]) || baseConfig.customFields.checkInDateFieldId,
      checkOutDateFieldId: readEnvValue(env, ["GHL_FIELD_CHECK_OUT_DATE_ID"]) || baseConfig.customFields.checkOutDateFieldId,
      reservationStatusFieldId: readEnvValue(env, ["GHL_FIELD_RESERVATION_STATUS_ID"]) || baseConfig.customFields.reservationStatusFieldId,
      paymentStatusFieldId: readEnvValue(env, ["GHL_FIELD_PAYMENT_STATUS_ID"]) || baseConfig.customFields.paymentStatusFieldId,
      finalTotalAmountFieldId: readEnvValue(env, ["GHL_FIELD_FINAL_TOTAL_AMOUNT_ID"]) || baseConfig.customFields.finalTotalAmountFieldId,
      holdExpiresAtFieldId: readEnvValue(env, ["GHL_FIELD_HOLD_EXPIRES_AT_ID"]) || baseConfig.customFields.holdExpiresAtFieldId,
      specialRequestsFieldId: readEnvValue(env, ["GHL_FIELD_SPECIAL_REQUESTS_ID"]) || baseConfig.customFields.specialRequestsFieldId,
      adultCountFieldId: readEnvValue(env, ["GHL_FIELD_ADULT_COUNT_ID"]) || baseConfig.customFields.adultCountFieldId,
      childCountFieldId: readEnvValue(env, ["GHL_FIELD_CHILD_COUNT_ID"]) || baseConfig.customFields.childCountFieldId,
      paymentReferenceFieldId: readEnvValue(env, ["GHL_FIELD_PAYMENT_REFERENCE_ID"]) || baseConfig.customFields.paymentReferenceFieldId,
      reservationReferenceFieldId: readEnvValue(env, ["GHL_FIELD_RESERVATION_REFERENCE_ID"]) || baseConfig.customFields.reservationReferenceFieldId,
      calendarStatusFieldId: readEnvValue(env, ["GHL_FIELD_CALENDAR_STATUS_ID"]) || baseConfig.customFields.calendarStatusFieldId,
      depositAmountDueFieldId: readEnvValue(env, ["GHL_FIELD_DEPOSIT_AMOUNT_DUE_ID"]) || baseConfig.customFields.depositAmountDueFieldId
    }
  };
}

export function hasLiveGhlId(value) {
  const normalized = cleanEnvValue(value);

  if (!normalized) {
    return false;
  }

  return !normalized.startsWith(GHL_ID_PLACEHOLDER_PREFIX);
}

export function collectMissingGhlConfigPaths(config = GHL_CONFIG, pathPrefix = "") {
  return Object.entries(config).reduce((missingPaths, [key, value]) => {
    const nextPath = pathPrefix ? `${pathPrefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      return missingPaths.concat(collectMissingGhlConfigPaths(value, nextPath));
    }

    if (!hasLiveGhlId(value)) {
      missingPaths.push(nextPath);
    }

    return missingPaths;
  }, []);
}

export function isGhlConfigReady(config = GHL_CONFIG) {
  return collectMissingGhlConfigPaths(config).length === 0;
}

export function summarizeGhlConfig(config = GHL_CONFIG) {
  const missingPaths = collectMissingGhlConfigPaths(config);

  return {
    ready: missingPaths.length === 0,
    missingPaths
  };
}
