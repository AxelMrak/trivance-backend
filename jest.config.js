/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@config/(.*)$": "<rootDir>/src/config/$1",
    "^@controllers/(.*)$": "<rootDir>/src/controllers/$1",
    "^@entities/(.*)$": "<rootDir>/src/entities/$1",
    "^@middlewares/(.*)$": "<rootDir>/src/middlewares/$1",
    "^@queries/(.*)$": "<rootDir>/src/queries/$1",
    "^@repositories/(.*)$": "<rootDir>/src/repositories/$1",
    "^@routes/(.*)$": "<rootDir>/src/routes/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^@validations/(.*)$": "<rootDir>/src/validations/$1",
    "^@migrations/(.*)$": "<rootDir>/migrations/$1",
    "^@scripts/(.*)$": "<rootDir>/scripts/$1",
    "^@test/(.*)$": "<rootDir>/test/$1",
  },
};

