const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

initializeApp({
  credential: applicationDefault(),
  projectId: "richbecks-enterprise",
});

const db = getFirestore();
const auth = getAuth();

module.exports = {
  db,
  auth,
  FieldValue,
};
