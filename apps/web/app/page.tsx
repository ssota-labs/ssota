import { redirect } from "next/navigation";

/** 루트는 마케팅 홈(`/home`)으로 보냅니다. */
export default function RootPage() {
  redirect("/home");
}
