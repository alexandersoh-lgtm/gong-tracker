import { redirect } from "next/navigation";

// Command Center is the default landing page. The original dashboard lives at /overview.
export default function Home() {
  redirect("/command-center");
}
