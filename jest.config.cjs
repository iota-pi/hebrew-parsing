module.exports = {
  transform: {
    "^.+\\.tsx?$": "@swc/jest",
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testEnvironment: 'node',
};
