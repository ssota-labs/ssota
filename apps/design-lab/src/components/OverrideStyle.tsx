import { useDesignLab } from "../context/design-lab-context";

export function OverrideStyle() {
  const { overrideCss } = useDesignLab();
  if (!overrideCss) return null;
  return <style id="design-lab-overrides">{overrideCss}</style>;
}
