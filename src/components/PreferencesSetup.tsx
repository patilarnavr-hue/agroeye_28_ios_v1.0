import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/ThemeProvider";
import { Globe, Bell, Moon, Sun, Volume2, VolumeX, ChevronRight, ChevronLeft, Sprout, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { saveNotificationPrefs } from "@/utils/pushNotifications";

interface PreferencesSetupProps {
  userId: string;
  onComplete: () => void;
}

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "mr", label: "मराठी", flag: "🇮🇳" },
  { code: "ta", label: "தமிழ்", flag: "🇮🇳" },
  { code: "te", label: "తెలుగు", flag: "🇮🇳" },
  { code: "kn", label: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "bn", label: "বাংলা", flag: "🇮🇳" },
  { code: "ur", label: "اردو", flag: "🇵🇰" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

const PreferencesSetup = ({ userId, onComplete }: PreferencesSetupProps) => {
  const { i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [selectedLang, setSelectedLang] = useState(i18n.language || "en");
  const [darkMode, setDarkMode] = useState(theme === "dark");
  const [notifications, setNotifications] = useState({
    enabled: true, moisture: true, schedule: true, alerts: true, irrigation: true, pest: true,
  });
  const [voiceResponse, setVoiceResponse] = useState(true);
  const [saving, setSaving] = useState(false);

  const steps = [
    {
      title: "Choose Your Language",
      subtitle: "Select the language you're most comfortable with",
      icon: Globe,
    },
    {
      title: "Appearance",
      subtitle: "Pick your preferred theme",
      icon: darkMode ? Moon : Sun,
    },
    {
      title: "Notifications",
      subtitle: "Stay informed about your farm",
      icon: Bell,
    },
    {
      title: "Chat & Voice",
      subtitle: "How should Sprout respond to you?",
      icon: Volume2,
    },
  ];

  const goNext = () => {
    if (step < steps.length - 1) {
      setDirection(1);
      setStep(step + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Apply language
      i18n.changeLanguage(selectedLang);

      // Apply theme
      setTheme(darkMode ? "dark" : "light");

      // Save voice preference
      localStorage.setItem("agroeye_voice_responses", voiceResponse ? "true" : "false");

      // Save notification preferences
      saveNotificationPrefs(notifications);

      // Request notification permission if enabled
      if (notifications.enabled && "Notification" in window) {
        await Notification.requestPermission();
      }

      // Save to database
      const { data: existing } = await supabase
        .from("user_preferences")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      const prefData = {
        user_id: userId,
        theme: darkMode ? "dark" : "light",
        notifications_enabled: notifications.enabled,
        notification_moisture: notifications.moisture,
        notification_schedule: notifications.schedule,
        notification_alerts: notifications.alerts,
        onboarding_completed: true,
      };

      if (existing) {
        await supabase.from("user_preferences").update(prefData).eq("user_id", userId);
      } else {
        await supabase.from("user_preferences").insert(prefData);
      }

      toast.success("Preferences saved!");
      onComplete();
    } catch (err) {
      console.error("Error saving preferences:", err);
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
  };

  const CurrentIcon = steps[step].icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Sprout className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Set Up Your Preferences</h1>
          <p className="text-sm text-muted-foreground mt-1">Customize AgroEye for your needs</p>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-6 px-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="ios-grouped-section p-5 min-h-[340px] flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <CurrentIcon className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">{steps[step].title}</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">{steps[step].subtitle}</p>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex-1"
            >
              {step === 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setSelectedLang(lang.code)}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                        selectedLang === lang.code
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span className="text-sm font-medium text-foreground">{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <button
                    onClick={() => setDarkMode(false)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      !darkMode
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Sun className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Light Mode</p>
                      <p className="text-xs text-muted-foreground">Bright and clear for daytime use</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setDarkMode(true)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      darkMode
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Moon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Dark Mode</p>
                      <p className="text-xs text-muted-foreground">Easy on the eyes, great at night</p>
                    </div>
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border">
                    <Label className="text-sm">Enable Notifications</Label>
                    <Switch checked={notifications.enabled} onCheckedChange={(c) => setNotifications({ ...notifications, enabled: c })} />
                  </div>
                  {notifications.enabled && (
                    <div className="space-y-2 pl-2">
                      {[
                        { key: "moisture" as const, label: "Moisture Alerts", desc: "When soil gets too dry or wet" },
                        { key: "schedule" as const, label: "Schedule Reminders", desc: "Upcoming watering times" },
                        { key: "alerts" as const, label: "General Alerts", desc: "Weather, health score changes" },
                        { key: "irrigation" as const, label: "Irrigation Alerts", desc: "Pump and irrigation events" },
                        { key: "pest" as const, label: "Pest Alerts", desc: "Disease detection warnings" },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                            <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                          </div>
                          <Switch
                            checked={notifications[item.key]}
                            onCheckedChange={(c) => setNotifications({ ...notifications, [item.key]: c })}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-border">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">Sprout AI Assistant</p>
                      <p className="text-[11px] text-muted-foreground">Your farming companion is always ready to help with questions, pest identification, and recommendations.</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setVoiceResponse(true)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      voiceResponse
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <Volume2 className="w-5 h-5 text-primary shrink-0" />
                    <div className="text-left">
                      <p className="font-medium text-foreground text-sm">Voice Responses On</p>
                      <p className="text-[11px] text-muted-foreground">Sprout reads answers aloud — great for hands-free farming</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setVoiceResponse(false)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      !voiceResponse
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <VolumeX className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="text-left">
                      <p className="font-medium text-foreground text-sm">Text Only</p>
                      <p className="text-[11px] text-muted-foreground">Quiet mode — read responses at your own pace</p>
                    </div>
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              disabled={step === 0}
              className="rounded-xl"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>

            {step < steps.length - 1 ? (
              <Button size="sm" onClick={goNext} className="rounded-xl">
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleFinish} disabled={saving} className="rounded-xl">
                {saving ? "Saving..." : "Get Started"} <Sparkles className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Skip */}
        <button
          onClick={handleFinish}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors mt-4"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default PreferencesSetup;
