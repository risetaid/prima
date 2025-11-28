#!/usr/bin/env node
import { randomBytes } from "node:crypto";

const VALID_ENCODINGS = ["hex", "base64", "base64url", "latin1"];
const DEFAULT_LENGTH = 32;
const DEFAULT_ENCODING = "hex";

function printUsage() {
  console.log(`Usage: node randomToken.js [length] [encoding]

Arguments:
  length   - Number of random bytes (default: ${DEFAULT_LENGTH})
  encoding - Output encoding: ${VALID_ENCODINGS.join(
    ", "
  )} (default: ${DEFAULT_ENCODING})

Examples:
  node randomToken.js           # 32 bytes, hex encoded (64 chars)
  node randomToken.js 16        # 16 bytes, hex encoded (32 chars)
  node randomToken.js 32 base64 # 32 bytes, base64 encoded`);
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printUsage();
  process.exit(0);
}

let length = DEFAULT_LENGTH;
let encoding = DEFAULT_ENCODING;

if (args.length > 0) {
  const parsedLength = parseInt(args[0], 10);
  if (isNaN(parsedLength) || parsedLength <= 0) {
    console.error(
      `Error: length must be a positive integer, got: "${args[0]}"\n`
    );
    printUsage();
    process.exit(1);
  }
  length = parsedLength;
}

if (args.length > 1) {
  const requestedEncoding = args[1].toLowerCase();
  if (!VALID_ENCODINGS.includes(requestedEncoding)) {
    console.error(
      `Error: encoding must be one of: ${VALID_ENCODINGS.join(", ")}, got: "${
        args[1]
      }"\n`
    );
    printUsage();
    process.exit(1);
  }
  encoding = requestedEncoding;
}

const token = randomBytes(length).toString(encoding);
console.log(token);
