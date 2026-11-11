import AdminDashboard from "@/components/admin-dashboard";
export const metadata = {
  title: "ILLAM Admin",
  robots: { index: false, follow: false },
};
export default function AdminPage() {
  return <AdminDashboard />;
}
