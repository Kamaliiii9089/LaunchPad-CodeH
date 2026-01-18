// const apiVersions = require("../config/apiVersions");

// module.exports = (req, res, next) => {
//   const versionMatch = req.originalUrl.match(/\/api\/(v\d+)/);

//   if (!versionMatch) return next();

//   const version = versionMatch[1];
//   const deprecated = apiVersions.deprecated[version];

//   if (deprecated) {
//     res.setHeader("Deprecation", "true");
//     res.setHeader("Sunset", deprecated.sunset);
//     res.setHeader(
//       "Link",
//       `</api/${apiVersions.latestVersion}>; rel="latest-version"`
//     );
//     res.setHeader("Warning", `299 - "${deprecated.message}"`);
//   }

//   next();
// };
