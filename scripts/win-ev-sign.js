// Script to sign a file using an EV Code Signing Certificate in a YubiKey.
//
// It expects `jsign-4.2.jar` to be at the same folder you are running this script.
// JSign depends on having `yubico-piv-tool` installed.
//
// Envvars:
// - WIN_EV_CERTIFICATE_FILE: Path to certificate (crt file)
// - WIN_EV_CERTIFICATE_NAME: Certificate name in YubiKey (use YubiKey Manager to check)
// - WIN_EV_TOKEN_PASSWORD: PIN for YubiKey PIV Certificate
//
// For further information, see Windows EV Code Signing in ELECTRON.md.
//
// Adapted from: https://www.electron.build/tutorials/code-signing-windows-apps-on-unix.html


exports.default = async function(configuration) {
  const CERTIFICATE_FILE = process.env.WIN_EV_CERTIFICATE_FILE;
  const CERTIFICATE_NAME = process.env.WIN_EV_CERTIFICATE_NAME;
  const TOKEN_PASSWORD = process.env.WIN_EV_TOKEN_PASSWORD;

  cmdline = [
    "java",
    "--add-exports jdk.crypto.cryptoki/sun.security.pkcs11=ALL-UNNAMED",
    "--add-exports jdk.crypto.cryptoki/sun.security.pkcs11.wrapper=ALL-UNNAMED",
    "--add-opens java.base/java.security=ALL-UNNAMED",
    "-jar jsign-4.2.jar",
    "--storetype YUBIKEY",
    `--certfile "${CERTIFICATE_FILE}"`,
    `--storepass "${TOKEN_PASSWORD}"`,
    `--alias "${CERTIFICATE_NAME}"`,
    `"${configuration.path}"`
  ];

  require("child_process").execSync(
    cmdline.join(" "),
    {
      stdio: "inherit"
    }
  );
};
