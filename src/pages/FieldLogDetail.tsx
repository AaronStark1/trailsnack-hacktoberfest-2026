import { useParams } from "react-router-dom";

export default function FieldLogDetail() {
  const { id } = useParams();
  return (
    <section aria-labelledby="logd-h">
      <h1 id="logd-h" className="text-3xl font-bold">
        Log entry
      </h1>
      <p className="mt-3">Entry {id ?? "unknown"}. Detail UI lands in Phase 5.</p>
    </section>
  );
}
