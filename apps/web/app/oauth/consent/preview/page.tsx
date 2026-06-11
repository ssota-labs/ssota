import { notFound } from "next/navigation";
import { OAuthConsentPreview } from "./preview-client";

export default function OAuthConsentPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <OAuthConsentPreview />;
}
