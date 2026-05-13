import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";

const licenses = [
  { name: "React", version: "18.3", license: "MIT", url: "https://github.com/facebook/react" },
  { name: "Vite", version: "5.x", license: "MIT", url: "https://github.com/vitejs/vite" },
  { name: "Tailwind CSS", version: "3.x", license: "MIT", url: "https://github.com/tailwindlabs/tailwindcss" },
  { name: "Framer Motion", version: "12.x", license: "MIT", url: "https://github.com/framer/motion" },
  { name: "Recharts", version: "2.x", license: "MIT", url: "https://github.com/recharts/recharts" },
  { name: "Radix UI", version: "1.x", license: "MIT", url: "https://github.com/radix-ui/primitives" },
  { name: "Lucide Icons", version: "0.4x", license: "ISC", url: "https://github.com/lucide-icons/lucide" },
  { name: "React Router", version: "6.x", license: "MIT", url: "https://github.com/remix-run/react-router" },
  { name: "TanStack Query", version: "5.x", license: "MIT", url: "https://github.com/TanStack/query" },
  { name: "Supabase JS", version: "2.x", license: "MIT", url: "https://github.com/supabase/supabase-js" },
  { name: "Capacitor", version: "7.x", license: "MIT", url: "https://github.com/ionic-team/capacitor" },
  { name: "i18next", version: "25.x", license: "MIT", url: "https://github.com/i18next/i18next" },
  { name: "Leaflet", version: "1.9", license: "BSD-2-Clause", url: "https://github.com/Leaflet/Leaflet" },
  { name: "jsPDF", version: "4.x", license: "MIT", url: "https://github.com/parallax/jsPDF" },
  { name: "Zod", version: "3.x", license: "MIT", url: "https://github.com/colinhacks/zod" },
  { name: "Sonner", version: "1.x", license: "MIT", url: "https://github.com/emilkowalski/sonner" },
  { name: "date-fns", version: "3.x", license: "MIT", url: "https://github.com/date-fns/date-fns" },
  { name: "Vaul", version: "0.9", license: "MIT", url: "https://github.com/emilkowalski/vaul" },
];

const Licenses = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/50 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Open Source Licenses</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <p className="text-sm text-muted-foreground leading-relaxed">
          AgroEye is built with the help of amazing open-source software. We are grateful to the developers and communities behind these projects.
        </p>

        <div className="space-y-1">
          {licenses.map((lib) => (
            <a
              key={lib.name}
              href={lib.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl hover:bg-accent/50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{lib.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">{lib.version}</span>
                </div>
                <span className="text-xs text-muted-foreground">{lib.license} License</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
            </a>
          ))}
        </div>

        <div className="pt-4 border-t border-border/50 space-y-3 text-xs text-muted-foreground leading-relaxed">
          <p>
            All trademarks and copyrights belong to their respective owners. The use of these libraries does not imply any endorsement by their authors.
          </p>
          <p>
            For the full license text of each library, please visit the respective repository linked above.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Licenses;
