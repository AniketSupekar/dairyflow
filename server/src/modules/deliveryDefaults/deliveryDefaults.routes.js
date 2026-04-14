/**
 * modules/deliveryDefaults/deliveryDefaults.routes.js
 *
 * Protected — requires auth + tenant (registered in app.js with protect array)
 */

const router     = require("express").Router();
const controller = require("./deliveryDefaults.controller");

router.post("/generate", controller.generateDefaults);

module.exports = router;