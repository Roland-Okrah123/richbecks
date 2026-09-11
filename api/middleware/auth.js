const { auth } = require("../firebaseAdmin");

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "unauthenticated",
        message: "You must be signed in.",
      });
    }

    const idToken = header.substring(7).trim();

    if (!idToken) {
      return res.status(401).json({
        success: false,
        error: "unauthenticated",
        message: "You must be signed in.",
      });
    }

    const decodedToken = await auth.verifyIdToken(idToken);

    req.auth = {
      uid: decodedToken.uid,
      token: decodedToken,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      success: false,
      error: "unauthenticated",
      message: "Your authentication token is invalid or expired.",
    });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    const role = req.auth?.token?.role;

    if (!roles.includes(role)) {
      return res.status(403).json({
        success: false,
        error: "permission-denied",
        message:
          "You do not have permission to perform this action.",
      });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
