import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES } from "@/lib/categories";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQueryClient } from "@tanstack/react-query";

export function QuickAddDialog({ userId, trigger }: { userId: string; trigger?: React.ReactNode }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState<string>("alimentari");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const value = parseFloat(amount.replace(",", "."));
    if (!value || value <= 0) {
      toast.error(t("common.amount") + " ?");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: userId,
      type,
      category: category as never,
      amount: value,
      date,
      note: note || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("✓");
    setOpen(false);
    setAmount("");
    setNote("");
    qc.invalidateQueries();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="gap-2 shadow-lg" style={{ background: "var(--gradient-brand)" }}>
            <Plus className="size-5" />
            {t("dashboard.quickAdd")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("transactions.add")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("common.type")}</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as "income" | "expense")}
              className="flex gap-4 mt-2"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="income" /> {t("transactions.typeIncome")}
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="expense" /> {t("transactions.typeExpense")}
              </label>
            </RadioGroup>
          </div>
          <div>
            <Label>{t("common.category")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("common.amount")} (€)</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label>{t("common.date")}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>{t("transactions.noteOptional")}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={saving}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}