type BundlePreviewUrls = {
  jsUrl: string;
  cssUrl?: string;
  buildId: string;
};

/** Fetch authenticated bundle assets in the parent and expose blob: URLs to the iframe. */
export async function resolveStudioBundlePreviewUrls(input: {
  jsPath: string;
  cssPath?: string;
  buildId: string;
}): Promise<BundlePreviewUrls | null> {
  const jsResponse = await fetch(input.jsPath);
  if (!jsResponse.ok) return null;

  const jsUrl = URL.createObjectURL(await jsResponse.blob());
  const urls: BundlePreviewUrls = { jsUrl, buildId: input.buildId };

  if (input.cssPath) {
    const cssResponse = await fetch(input.cssPath);
    if (cssResponse.ok) {
      urls.cssUrl = URL.createObjectURL(await cssResponse.blob());
    }
  }

  return urls;
}

export function revokeStudioBundlePreviewUrls(
  preview: BundlePreviewUrls | null | undefined,
) {
  if (!preview) return;
  URL.revokeObjectURL(preview.jsUrl);
  if (preview.cssUrl) {
    URL.revokeObjectURL(preview.cssUrl);
  }
}
