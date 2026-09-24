const {
  initializeApp,
  cert,
} = require("firebase-admin/app");

const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const fs = require("fs");

const projectId = "richbecks-enterprise";

let app;

const renderSecretPath = "/etc/secrets/firebase-service-account.json";

if (fs.existsSync(renderSecretPath)) {
  const serviceAccount = JSON.parse(
    fs.readFileSync(renderSecretPath, "utf8"),
  );

  app = initializeApp({
    credential: cert(serviceAccount),
    projectId,
  });
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  const serviceAccount = JSON.parse(
    Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
      "base64",
    ).toString("utf8"),
  );

  app = initializeApp({
    credential: cert(serviceAccount),
    projectId,
  });
} else {
  throw new Error(
    "Firebase Admin credentials were not found.",
  );
}

const db = getFirestore(app);
const auth = getAuth(app);

module.exports = {
  db,
  auth,
  FieldValue,
};