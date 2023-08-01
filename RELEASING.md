# Bumping up the version

The following files must be updated: `src/constants.js`, `public/electron.js`, `package.json`, and `package-lock.json`.

In the `package.json` and `package-lock.json`, the field `version` must be updated.

In the `src/constants.js`, the variable named `VERSION` must be updated.

In the `public/electron.js`, the variable named `walletVersion` must be updated.

Create a git tag and a new release on GitHub.

# Publishing the new App

In case this is a Hathor release, make sure you also read our internal guide in https://github.com/HathorNetwork/ops-tools/blob/master/docs/release-guides/hathor-wallet.md

1. Run the `release.sh` script, which will clean the environment and build the app for all platforms. The files go to the `dist` folder after the script finishes running. You should get 4 of them: `.AppImage`, `.deb`, `.dmg` and `.exe`.

1. Generate and concatenate the sha256sum for all 4 files with the following command:

```
for file in *.AppImage *.deb *.dmg *.exe; do sha256sum "$file" >> SHA256SUMS; done
```

This will generate a SHA256SUMS file containing all hashes, one per line.

1. Sign the SHA256SUMS file with your GPG key:

```
gpg --armor --output SHA256SUMS.asc --detach-sig SHA256SUMS
```

This will generate a SHA256SUMS.asc file containing the signature.

1. Optionally, you can ask other signers to follow the same procedure and concatenate their signatures to the SHA256SUMS.asc file. This way we will have more than one person attesting the files.

1. Upload the 4 package files, the SHA256SUMS and the SHA256SUMS.asc to the new GitHub release.

# Signature verification

To verify the signature of one of our packages, you should download it together with the SHA256SUMS and SHA256SUMS.asc files from the same release. The latest release can be found in https://github.com/HathorNetwork/hathor-wallet/releases/latest.

Then, you should verify the SHA256SUMS file with:

```
sha256sum --ignore-missing --check SHA256SUMS
```

In the output produced by the above command, you can safely ignore any warnings and failures, but you must ensure the output lists "OK" after the name of the release file you downloaded. For example: `hathor-wallet_0.26.0_amd64.deb: OK`

You'll need to import the public GPG key of our signers to verify the signature. Check [Our public keys](#our-public-keys) to see how to add them to your keyring.

Finally, verify the signature of the SHA256SUMS file with:

```
gpg --verify SHA256SUMS.asc SHA256SUMS
```

Ideally, you'll see something like:

```
gpg: Signature made Fri 09 Oct 2015 05:41:55 PM CEST using RSA key ID 4F25E3B6
gpg: Good signature from "John Paul (dist sig)" [full]
```

Which indicates that the signature is valid.

If you didn't import the public keys of our signers, you'll get an error like this:

```
gpg: Can't check signature: No public key
```

If you did import the public keys, you may still get a warning like this:

```
gpg: WARNING: This key is not certified with a trusted signature!
gpg:          There is no indication that the signature belongs to the owner.
```

This means you have a copy of the key and the signature is valid, but either you have not marked the key as trusted or the key is a forgery. In this case, at the very least, you should compare the fingerprints for the signatures in [Our public keys](#our-public-keys) with the fingerprints of the keys you have in your keyring. If they match, you can mark the keys as trusted with:

```
gpg --edit-key <key-id>
$ trust
```

## Our public keys

Current releases are signed by one or more of the keys in [./gpg-keys](./gpg-keys). You should download them all and import them with: 

```
gpg --import *.pgp
```

After doing so, you can get their fingerprints by listing all your keys:

```
gpg --list-keys
```

Compare the fingerprints with our list below to make sure the keys you have are legit.

You can optionally mark the keys as trusted with:

```
gpg --edit-key <key-id>
$ trust
```

Then choose the trust level you want to give to the key.

WARNING: Make sure there are no recent commits altering the existing keys in [./gpg-keys](./gpg-keys) or the fingerprint list below. We will not change them often. If there are, you should check the commit history to make sure the commits are signed themselves by someone from Hathor Labs. If you are not sure, please contact us.

These are the fingerprints of the keys we currently have in the repository:

```
```

# Adding your GPG key to the repository

If you want to sign the releases, you should add your GPG key to the repository. To do so, you should open a PR that:

1. Adds your public key to the [./gpg-keys](./gpg-keys) folder.
1. Adds your fingerprint to the list in [Our public keys](#our-public-keys).