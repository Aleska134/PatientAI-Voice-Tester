const services = [
  'ACA marketplace guidance',
  'Subsidy pre-qualification',
  'Agent callback in under 15 minutes',
];

export default function Services() {
  return (
    <section>
      <h2 className="text-2xl font-semibold">What we offer</h2>
      <ul className="mt-3 space-y-2 text-slate-700">
        {services.map((service) => (
          <li key={service}>• {service}</li>
        ))}
      </ul>
    </section>
  );
}
