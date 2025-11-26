const crypto = require("crypto");

function printUsage() {
  console.log(
    `Usage: node randomToken.js [length] [encoding]\n\nArguments:\n  length   - Number of random bytes (default: 32)\n  encoding - Output encoding: hex, base64, latin1 (default: hex)`
  );
}

const args = process.argv.slice(2);
let length = 32;
let encoding = "hex";

if (args.length > 0) {
  const parsedLength = parseInt(args[0], 10);
  if (isNaN(parsedLength) || parsedLength <= 0) {
    console.error("Error: length must be a positive integer.\n");
    printUsage();
    process.exit(1);
  }
  length = parsedLength;
}

if (args.length > 1) {
  const validEncodings = ["hex", "base64", "latin1"];
  if (!validEncodings.includes(args[1])) {
    console.error(
      `Error: encoding must be one of: ${validEncodings.join(", ")}.\n`
    );
    printUsage();
    process.exit(1);
  }
  encoding = args[1];
}

const token = crypto.randomBytes(length).toString(encoding);
console.log(token);
