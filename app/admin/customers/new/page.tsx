import { CustomerForm } from "@/components/customer-form";
import Link from "next/link";

export default function NewCustomerPage() {
  return (
    <div>
      <Link href="/admin/customers" className="text-sm text-fm-muted hover:text-fm-ink">← Customers</Link>
      <h1 className="display text-4xl mt-2 mb-6">New customer</h1>
      <CustomerForm />
    </div>
  );
}
