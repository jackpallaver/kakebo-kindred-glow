import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Share, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

export function InstallAppCard() {
  const { t } = useTranslation();
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIos(/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document));
    setInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true,
    );
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed) {
    return (
      <Card className="p-6 flex items-center gap-3">
        <Check className="size-5 text-success shrink-0" />
        <div>
          <h2 className="font-semibold">{t("install.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("install.alreadyInstalled")}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-3">
      <h2 className="font-semibold flex items-center gap-2">
        <Download className="size-4 text-primary" />
        {t("install.title")}
      </h2>
      {isIos ? (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>{t("install.iosIntro")}</p>
          <ol className="list-decimal ps-5 space-y-1">
            <li className="flex flex-wrap items-center gap-1">
              <Share className="size-4 text-primary" />
              <span>{t("install.iosStep1")}</span>
            </li>
            <li>{t("install.iosStep2")}</li>
            <li>{t("install.iosStep3")}</li>
          </ol>
        </div>
      ) : deferred ? (
        <>
          <p className="text-sm text-muted-foreground">{t("install.androidIntro")}</p>
          <Button
            style={{ background: "var(--gradient-brand)" }}
            onClick={async () => {
              await deferred.prompt();
              setDeferred(null);
            }}
          >
            <Download className="size-4 me-2" />
            {t("install.button")}
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t("install.androidFallback")}</p>
      )}
    </Card>
  );
}