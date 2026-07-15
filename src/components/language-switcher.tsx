import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORTED_LANGUAGES, applyLanguageDirection } from "@/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher({ userId }: { userId?: string }) {
  const { i18n } = useTranslation();

  async function change(code: string) {
    await i18n.changeLanguage(code);
    applyLanguageDirection(code);
    if (userId) {
      await supabase.from("profiles").update({ language: code as never }).eq("id", userId);
    }
  }

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="size-4" />
          <span className="hidden sm:inline">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => change(l.code)}>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}