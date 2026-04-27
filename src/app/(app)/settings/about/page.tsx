import { redirect } from "next/navigation";

export default function SettingsAboutRedirectPage() {
  redirect("/about/version");
}
