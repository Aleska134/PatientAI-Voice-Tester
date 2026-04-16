import { listLeads } from '@/lib/db';
import { formatCurrency } from '@/lib/utils/format';

export default function DashboardPage() {
  const leads = listLeads();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-bold">Lead Dashboard</h1>
      <p className="mt-2 text-slate-600">Operational view for agents to prioritize hot leads.</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">ZIP</th>
              <th className="p-3">Premium</th>
              <th className="p-3">Subsidy</th>
              <th className="p-3">Net</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t border-slate-200">
                <td className="p-3">{lead.fullName}</td>
                <td className="p-3">{lead.email}</td>
                <td className="p-3">{lead.zipCode}</td>
                <td className="p-3">{formatCurrency(lead.estimatedMonthlyPremium)}</td>
                <td className="p-3">{formatCurrency(lead.estimatedMonthlySubsidy)}</td>
                <td className="p-3 font-medium">{formatCurrency(lead.netMonthlyCost)}</td>
              </tr>
            ))}
            {leads.length === 0 ? (
              <tr>
                <td className="p-4 text-slate-500" colSpan={6}>No leads yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
