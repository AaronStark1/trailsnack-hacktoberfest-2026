import { useParams } from "react-router-dom";

export default function Assess() {
  const { id } = useParams();
  return (
    <section aria-labelledby="assess-h">
      <h1 id="assess-h" className="text-3xl font-bold">
        Assessment
      </h1>
      <p className="mt-3">Draft {id ?? "unknown"}. Full assessment lands in Phase 5.</p>
    </section>
  );
}
