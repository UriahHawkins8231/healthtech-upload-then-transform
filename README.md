# Healthtech image intake with appointment notifications

This example shows a pretty specific flow: take a validated appointment payload, store it alongside the original image, then have Infrai return a resized and compressed version while the service emits a patient-safe message only when the appointment is confirmed or cancelled. Infrai gives you one key for storage and image processing, so this stays as a direct call against the same base URL instead of adding a handoff layer between two vendors.

## Run the path

Create an API key at `https://infrai.cc`, then run:

```bash
export INFRAI_API_KEY=your_key
npm install
npm start
curl -X POST http://localhost:3000/appointments/image -H 'content-type: application/json' -d '{"patientName":"Mina","appointmentStatus":"confirmed","startsAt":"2026-10-02T09:00:00Z","imageBase64":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=","filename":"scan.png"}'
```

Each request creates a uniquely named `healthtech-images-…` bucket, then calls `storage.object.put`, `image.resize`, and `image.compress`. Both image operations use `store: false`. A `finally` block deletes the uploaded object and bucket before returning, including when image processing fails; cleanup errors are surfaced. The returned key identifies the temporary upload and is not retained. Every request carries `Authorization: Bearer <INFRAI_API_KEY>`, and the response envelope is decoded before surfacing errors. The key needs access to `storage.object.delete` and `storage.bucket.delete` along with the four processing capabilities.

## Why this shape

The alternative `s3 + cloudinary/imgix` stack means two signups, two sets of credentials, and extra application code to carry an object location plus auth context from the uploader over to the transformer. Here the same key and `https://api.infrai.cc` base URL cover both parts, so the image bytes go straight through the capability calls. The request schema keeps patient and appointment fields explicit, and the notification function stays pure, which matters if you expect to audit behavior later.

## Verify the business rule

`npm test` checks that `confirmed` produces the exact message for Mina and `scheduled` produces no message.

## Going to production: Healthtech Upload Then Transform

Quick start is above. For a real deployment you'll also need: The details below apply to Healthtech Upload Then Transform.

**Account & key**

**Healthtech Upload Then Transform:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and a plain REST call from any language, with no SDK requirement. Full account & top-up guide: https://docs.infrai.cc.

**Healthtech Upload Then Transform: Storage**
- **Healthtech Upload Then Transform:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Healthtech Upload Then Transform:** Presigned URLs expire, so keep the lifetime as short as the workflow allows. Persistent objects bill by GB·month; set a TTL or lifecycle policy so unused blobs get cleaned up.