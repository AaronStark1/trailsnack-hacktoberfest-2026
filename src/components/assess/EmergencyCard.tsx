import { Phone } from "lucide-react";
import Card from "../ui/Card.tsx";

export default function EmergencyCard({
  universal,
  regional,
}: {
  universal: string[];
  regional: { label: string; poison_control: string; emergency: string; note?: string } | null;
}) {
  return (
    <section aria-labelledby="emergency-h">
      <h2 id="emergency-h" className="text-2xl font-bold">
        Emergency
      </h2>
      <Card className="mt-2">
        {regional && (
          <p className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            <Phone size={22} aria-hidden />
            <a className="underline" href={`tel:${regional.poison_control.replace(/[^+\d]/g, "")}`}>
              Poison control: {regional.poison_control}
            </a>
            <span aria-hidden>·</span>
            <a className="underline" href={`tel:${regional.emergency.replace(/[^+\d]/g, "")}`}>
              Emergency: {regional.emergency}
            </a>
            <span className="w-full text-base font-normal opacity-80">
              {regional.label}
              {regional.note ? ` — ${regional.note}` : ""}
            </span>
          </p>
        )}
        <ul className="mt-2 list-disc pl-6">
          {universal.map((u, i) => (
            <li key={i} className="mt-1">
              {u}
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
