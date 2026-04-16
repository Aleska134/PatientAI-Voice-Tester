import { formatCurrency } from '@/lib/utils/format';

type PricingCardProps = {
  title: string;
  monthly: number;
  note?: string;
};

export default function PricingCard({ title, monthly, note }: PricingCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 p-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-2xl font-bold">{formatCurrency(monthly)}<span className="text-sm font-normal">/mo</span></p>
      {note ? <p className="mt-2 text-sm text-slate-600">{note}</p> : null}
    </article>
  );
}
