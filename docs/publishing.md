# Publishing

Release identity: `ReoX86.gnuplot-markdown-preview`. Repository owner: `Reonarudo`.

1. Run CI checks, package, and `npm run test:package`. Install the VSIX in VS Code and inspect the built-in Markdown Preview.
2. Push the matching `v0.1.0` tag. The release workflow repeats checks, tests the packaged extension, and attaches its VSIX and SHA-256 digest to the GitHub Release.
3. Download that release asset, run `npm run test:package -- /path/to/asset.vsix`, and install it in VS Code. Publish **that same file** with `npx vsce publish --packagePath /path/to/asset.vsix` (or add `--azure-credential` for an authorized Entra identity).
4. Verify Marketplace version, metadata, and installation by extension ID, then repeat the preview check.

## Authentication

Microsoft currently recommends Microsoft Entra ID with workload identity federation. Configuring this requires publisher membership and user-owned Azure resources; this repository does not provision them or embed long-lived credentials in GitHub Actions. The GitHub release pipeline is complete independently of Marketplace authentication.

For an initial interactive release, Microsoft's documented PAT path remains available as of 2026-09-16: Azure DevOps → User settings → Personal access tokens → New Token → All accessible organizations → Marketplace: Manage. Use a short expiration and enter it only at `npx vsce login ReoX86`'s hidden local prompt. Never paste tokens into chat or commit them.

**Azure DevOps global PATs retire December 1, 2026.** Migrate to an authorized Entra publishing identity before then. Add the identity to the Marketplace publisher with the Contributor role, then use `vsce publish --azure-credential`. No PAT-dependent automatic Marketplace workflow is configured here.

References: [Microsoft publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension), [publisher management](https://marketplace.visualstudio.com/manage/publishers/).

## Direct upload without an Azure DevOps PAT

Microsoft also supports uploading the exact tested VSIX at the Marketplace publisher management page: select **ReoX86**, choose **New extension → Visual Studio Code**, select the release asset, and publish it. Sign-in can redirect through Microsoft's `app.vssps.visualstudio.com` identity service. This method does not require provisioning an Azure DevOps organization or changing an existing Azure directory. Use the Microsoft account authorized for this publisher.
