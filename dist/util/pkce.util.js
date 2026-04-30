"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCodeChallenge = exports.generateCodeVerifier = void 0;
exports.generateState = generateState;
const crypto_1 = __importDefault(require("crypto"));
const generateCodeVerifier = () => {
    return crypto_1.default.randomBytes(32).toString("base64url");
};
exports.generateCodeVerifier = generateCodeVerifier;
const generateCodeChallenge = (verifier) => {
    return crypto_1.default.createHash("sha256").update(verifier).digest("base64url");
};
exports.generateCodeChallenge = generateCodeChallenge;
function generateState() {
    return crypto_1.default.randomBytes(16).toString("hex");
    // Random string to prevent CSRF attacks
}
