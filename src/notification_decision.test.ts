import { strict as assert } from "node:assert";
import { notificationFor } from "./notification_decision.ts";

assert.equal(notificationFor({ status: "confirmed", patientName: "Mina", startsAt: "2026-10-02T09:00:00Z" }), "Appointment confirmed for Mina at 2026-10-02T09:00:00Z");
assert.equal(notificationFor({ status: "scheduled", patientName: "Mina", startsAt: "2026-10-02T09:00:00Z" }), null);
console.log("notification decision test passed");
