const { initializeApp } = require('firebase-admin/app');
initializeApp();

module.exports = {
  ...require('./auth'),
  ...require('./sales'),
  ...require('./purchases'),
  ...require('./credits'),
  ...require('./returns'),
  ...require('./dashboard'),
  ...require('./notifications'),
};
