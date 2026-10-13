import { getDashboardData } from "@/lib/dashboard";
import { Cockpit } from "@/components/cockpit";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const initialData = await getDashboardData();
  return <Cockpit initialData={initialData} />;
}
