import { redirect } from "next/navigation";
import { DEMO_DESK_ADDRESS } from "@/lib/chain";

// Until a wallet can connect, the desk opens the real demo desk read-only.
export default function DeskPage() {
  redirect(`/view/${DEMO_DESK_ADDRESS}`);
}
