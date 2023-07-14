# Bumping up the version

The following files must be updated: `src/constants.js`, `public/electron.js`, `package.json`, and `package-lock.json`.

In the `package.json` and `package-lock.json`, the field `version` must be updated.

In the `src/constants.js`, the variable named `VERSION` must be updated.

In the `public/electron.js`, the variable named `walletVersion` must be updated.

Create a git tag and a new release on GitHub.

# Publishing the new App

In case this is a Hathor release, make sure you also read our internal guide in https://github.com/HathorNetwork/ops-tools/blob/master/docs/release-guides/hathor-wallet.md

1. Run the `release.sh` script, which will clean the environment and build the app for all platforms. The files go to the `dist` folder after the script finishes running. You should get 4 of them: `.AppImage`, `.deb`, `.dmg` and `.exe`.

2. Sign all 4 files with the following command:

```
for file in *.AppImage *.deb *.dmg *.exe; do gpg --output "$file.sig" --detach-sig "$file"; done
```

This will generate four signatures with the `.sig` extension.

You should upload the 4 files and the 4 signatures to the GitHub release.

# Signature verification

To verify the signature of one of our packages, you can download it and its corresponding signature and use the following command:

```
gpg --verify <file>.sig <file>
```

For this to work, you must have the public key of the signer in your keyring. Check [Our public keys](#our-public-keys) to see how to add them. Otherwise, you'll get errors like this when trying to verify:

```
gpg: Can't check signature: No public key
```

If you did add our public keys, you may still get an error like this:

TODO: Change the name in this example.

```
gpg: Good signature from "Werner Koch (dist sig)" [unknown]
gpg: WARNING: This key is not certified with a trusted signature!
gpg:          There is no indication that the signature belongs to the owner.
```

then you have a copy of our keys and the signatures are valid, but either you have not marked the keys as trusted or the keys are a forgery. In this case, at the very least, you should compare the fingerprints for the signatures that are shown below.

Ideally, you'll see something like:

```
gpg: Signature made Fri 09 Oct 2015 05:41:55 PM CEST using RSA key ID 4F25E3B6
gpg: Good signature from "Werner Koch (dist sig)" [full]
```

Which indicates that the signature is valid.

## Our public keys

Current releases are signed by one or more of these keys:

TODO: This is just a copy from GPG site. We need to add our own keys here.

WARNING: Make sure there are no recent commits altering the keys in this file. We will not change them often. If there are, you should check the commit history to make sure the commits are signed themselves by someone from Hathor Labs. If you are not sure, please contact us.

```
pub   rsa3072 2017-03-17 [SC] [expires: 2027-03-15]
      5B80 C575 4298 F0CB 55D8  ED6A BCEF 7E29 4B09 2E28
uid   Andre Heinecke (Release Signing Key)

pub   ed25519 2020-08-24 [SC] [expires: 2030-06-30]
      6DAA 6E64 A76D 2840 571B  4902 5288 97B8 2640 3ADA
uid   Werner Koch (dist signing 2020)

pub   ed25519 2021-05-19 [SC] [expires: 2027-04-04]
      AC8E 115B F73E 2D8D 47FA  9908 E98E 9B2D 19C6 C8BD
uid   Niibe Yutaka (GnuPG Release Key)
```

Below is a public key block with the above keys;

```
TODO: Add the block here.
```