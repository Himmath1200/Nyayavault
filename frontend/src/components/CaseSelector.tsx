import { useQuery } from "@tanstack/react-query";
import { casesService } from "@/services/cases";
import { Select } from "@/components/ui/Input";

export function useCaseSelector(preselected?: string | null) {
  const { data: cases } = useQuery({ queryKey: ["cases-all"], queryFn: () => casesService.list() });
  return { cases: cases ?? [], defaultCaseId: preselected ?? cases?.find((c) => c.security_flagged)?.id ?? cases?.[0]?.id };
}

export function CaseSelector({ cases, value, onChange }: { cases: { id: string; case_number: string; title: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className="w-72">
      {cases.map((c) => (
        <option key={c.id} value={c.id}>
          {c.case_number} — {c.title}
        </option>
      ))}
    </Select>
  );
}
